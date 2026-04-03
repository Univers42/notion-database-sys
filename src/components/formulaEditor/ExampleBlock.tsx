/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ExampleBlock.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:33 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState } from 'react';
import { ArrowUpRight, CheckSquare } from 'lucide-react';
import { cn } from '../../utils/cn';

/** Renders a copyable/insertable formula example code snippet. */
export function ExampleBlock({ code, onInsert }: Readonly<{ code: string; onInsert: (text: string) => void }>) {
  const [copied, setCopied] = useState(false);

  return (
    <div className={cn("flex items-start gap-1 group")}>
      <div className={cn("flex-1 p-1.5 rounded bg-surface-primary border border-line font-mono text-[11px] text-ink-body break-all leading-snug")}>
        {code}
      </div>
      <div className={cn("flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity")}>
        <button onClick={() => onInsert(code)}
          className={cn("p-1 rounded hover:bg-hover-accent-soft text-ink-muted hover:text-hover-accent-text transition-colors")}
          title="Insert into formula">
          <ArrowUpRight className={cn("w-3 h-3")} />
        </button>
        <button onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className={cn("p-1 rounded hover:bg-hover-surface2 text-ink-muted hover:text-hover-text transition-colors")}
          title="Copy">
          {copied ? (
            <CheckSquare className={cn("w-3 h-3 text-success-text")} />
          ) : (
            <svg className={cn("w-3 h-3")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
