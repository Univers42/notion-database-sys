/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   buffer.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 19:24:16 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { ChangeEvent } from '@notion-db/contract-types';

const DEFAULT_REPLAY_BUFFER_SIZE = 1_000;

/** Process start timestamp prefix used to detect replay gaps across restarts. */
export const processStartMs = Date.now();

/** Sequenced event entry stored in the replay ring buffer. */
export interface ReplayEntry {
  id: string;
  counter: number;
  event: ChangeEvent;
}

/** Replay lookup result for a Last-Event-ID cursor. */
export type ReplayResult =
  | { status: 'ok'; entries: ReplayEntry[] }
  | { status: 'gap'; reason: 'invalid-id' | 'process-restart' | 'too-old' | 'future-id' };

const replayBufferSize = readReplayBufferSize();
const entries: ReplayEntry[] = [];
let counter = 0;

/** Returns the configured replay ring buffer size. */
export function getReplayBufferSize(): number {
  return replayBufferSize;
}

/** Adds a ChangeEvent to the replay buffer with a monotonic sequence id. */
export function appendReplayEvent(event: ChangeEvent): ReplayEntry {
  counter += 1;
  const entry: ReplayEntry = {
    id: formatSequenceId(counter),
    counter,
    event,
  };
  entries.push(entry);
  while (entries.length > replayBufferSize) entries.shift();
  return entry;
}

/** Returns buffered events newer than Last-Event-ID, or a replay gap. */
export function getReplaySince(lastEventId: string): ReplayResult {
  const parsed = parseSequenceId(lastEventId);
  if (!parsed) return { status: 'gap', reason: 'invalid-id' };
  if (parsed.processStartMs !== processStartMs) return { status: 'gap', reason: 'process-restart' };
  if (parsed.counter > counter) return { status: 'gap', reason: 'future-id' };

  const oldestCounter = entries[0]?.counter;
  if (oldestCounter !== undefined && parsed.counter < oldestCounter - 1) {
    return { status: 'gap', reason: 'too-old' };
  }

  return { status: 'ok', entries: entries.filter(entry => entry.counter > parsed.counter) };
}

/** Returns the latest known event id, or the initial cursor for this process. */
export function getCurrentSequenceId(): string {
  return entries.at(-1)?.id ?? formatSequenceId(counter);
}

/** Returns a synthetic state-replaced entry for replay gap notifications. */
export function createStateReplacedEntry(): ReplayEntry {
  return {
    id: getCurrentSequenceId(),
    counter,
    event: { type: 'state-replaced' },
  };
}

/** Parses the numeric counter component from a sequence id. */
export function getSequenceCounter(id: string | null | undefined): number | null {
  if (!id) return null;
  return parseSequenceId(id)?.counter ?? null;
}

function formatSequenceId(value: number): string {
  return `${processStartMs}-${value}`;
}

function parseSequenceId(value: string): { processStartMs: number; counter: number } | null {
  const match = /^(\d+)-(\d+)$/.exec(value);
  if (!match) return null;
  const parsedProcessStartMs = Number(match[1]);
  const parsedCounter = Number(match[2]);
  if (!Number.isSafeInteger(parsedProcessStartMs) || !Number.isSafeInteger(parsedCounter)) return null;
  if (parsedCounter < 0) return null;
  return { processStartMs: parsedProcessStartMs, counter: parsedCounter };
}

function readReplayBufferSize(): number {
  const rawValue = process.env.CONTRACT_REPLAY_BUFFER_SIZE;
  if (!rawValue) return DEFAULT_REPLAY_BUFFER_SIZE;
  const parsed = Number(rawValue);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return DEFAULT_REPLAY_BUFFER_SIZE;
  return parsed;
}
