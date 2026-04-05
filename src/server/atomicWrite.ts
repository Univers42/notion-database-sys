/** @file atomicWrite.ts — Durable atomic file writes via tmp+fsync+rename. */

import {
  writeFileSync, renameSync, unlinkSync,
  openSync, fsyncSync, closeSync,
} from 'node:fs';

/**
 * Atomically writes `data` to `filePath`.
 *
 * Strategy: write to a temporary sibling, fsync for durability,
 * then rename (atomic on POSIX).  If any step fails the temp file
 * is cleaned up and the original file is left untouched.
 */
export function atomicWriteSync(filePath: string, data: string): void {
  const tmp = `${filePath}.tmp`;

  writeFileSync(tmp, data, 'utf-8');

  let fd: number | undefined;
  try {
    fd = openSync(tmp, 'r');
    fsyncSync(fd);
  } finally {
    if (fd !== undefined) closeSync(fd);
  }

  try {
    renameSync(tmp, filePath);
  } catch (err: unknown) {
    // Clean up orphaned temp file before re-throwing
    try { unlinkSync(tmp); } catch { /* best-effort cleanup */ }
    throw err;
  }
}
