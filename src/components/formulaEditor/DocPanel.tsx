/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DocPanel.tsx                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:31 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:36:32 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { HelpCircle } from 'lucide-react';
import type { SchemaProperty } from '../../types/database';
import type { FunctionDef } from './catalog';
import { getReturnTypeBadge, propReturnType } from './catalog';
import { PropTypeIcon } from './PropTypeIcon';
import { ExampleBlock } from './ExampleBlock';
import { cn } from '../../utils/cn';

type SelectedItem = { type: 'property'; prop: SchemaProperty } | { type: 'function'; fn: FunctionDef } | null;

export function DocPanel({ selectedItem, insertAtCursor }: Readonly<{ selectedItem: SelectedItem; insertAtCursor: (text: string) => void }>) {
  if (!selectedItem) {
    return (
      <div className={cn("w-[240px] shrink-0 border-l border-line-light bg-surface-secondary-soft5 flex flex-col overflow-hidden")}>
        <div className={cn("flex-1 flex flex-col items-center justify-center p-4 text-center")}>
          <HelpCircle className={cn("w-8 h-8 text-ink-faint mb-2")} />
          <p className={cn("text-xs text-ink-muted leading-relaxed")}>
            Hover over a property or function to see its documentation and usage examples.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-[240px] shrink-0 border-l border-line-light bg-surface-secondary-soft5 flex flex-col overflow-hidden")}>
      <div className={cn("flex-1 overflow-y-auto p-3 space-y-3")}>
        {selectedItem.type === 'property'
          ? <PropertyDoc prop={selectedItem.prop} insertAtCursor={insertAtCursor} />
          : <FunctionDoc fn={selectedItem.fn} insertAtCursor={insertAtCursor} />}
      </div>
    </div>
  );
}

function PropertyDoc({ prop, insertAtCursor }: Readonly<{ prop: SchemaProperty; insertAtCursor: (text: string) => void }>) {
  return (
    <>
      <div className={cn("flex items-center gap-2")}>
        <PropTypeIcon type={prop.type} className={cn("w-4 h-4 text-ink-secondary")} />
        <span className={cn("text-sm font-semibold text-ink-strong truncate")}>{prop.name}</span>
      </div>
      <div className={cn("space-y-2")}>
        <DocField label="Type"><p className={cn("text-xs text-ink-body-light mt-0.5")}>{prop.type.replace(/_/g, ' ')}</p></DocField>
        <DocField label="Returns"><div className={cn("mt-0.5")}>{getReturnTypeBadge(propReturnType(prop.type))}</div></DocField>
        <DocField label="Usage">
          <div className={cn("mt-1 p-2 rounded-md bg-surface-primary border border-line font-mono text-xs text-ink-body")}>
            prop(&quot;{prop.name}&quot;)
          </div>
        </DocField>
        <DocField label="Examples">
          <div className={cn("mt-1 space-y-1.5")}>
            {prop.type === 'number' && (
              <>
                <ExampleBlock code={`prop("${prop.name}") * 2`} onInsert={insertAtCursor} />
                <ExampleBlock code={`if(prop("${prop.name}") > 100, "High", "Low")`} onInsert={insertAtCursor} />
              </>
            )}
            {prop.type === 'text' && (
              <>
                <ExampleBlock code={`length(prop("${prop.name}"))`} onInsert={insertAtCursor} />
                <ExampleBlock code={`contains(prop("${prop.name}"), "keyword")`} onInsert={insertAtCursor} />
              </>
            )}
            {(prop.type === 'date' || prop.type === 'due_date') && (
              <>
                <ExampleBlock code={`dateBetween(now(), prop("${prop.name}"), "days")`} onInsert={insertAtCursor} />
                <ExampleBlock code={`formatDate(prop("${prop.name}"), "MMM DD, YYYY")`} onInsert={insertAtCursor} />
              </>
            )}
            {prop.type === 'checkbox' && (
              <ExampleBlock code={`if(prop("${prop.name}"), "✅", "❌")`} onInsert={insertAtCursor} />
            )}
            {(prop.type === 'select' || prop.type === 'status') && (
              <ExampleBlock code={`if(prop("${prop.name}") == "Done", "✅", "🔄")`} onInsert={insertAtCursor} />
            )}
            <ExampleBlock code={`prop("${prop.name}")`} onInsert={insertAtCursor} />
          </div>
        </DocField>
      </div>
    </>
  );
}

function FunctionDoc({ fn, insertAtCursor }: Readonly<{ fn: FunctionDef; insertAtCursor: (text: string) => void }>) {
  return (
    <>
      <div className={cn("flex items-center gap-2")}>
        <span className={cn("w-5 h-5 flex items-center justify-center text-[11px] font-bold text-accent-text-light bg-accent-muted rounded shrink-0 font-mono")}>ƒ</span>
        <span className={cn("text-sm font-semibold text-ink-strong truncate")}>{fn.name}</span>
      </div>
      <div className={cn("space-y-2")}>
        <DocField label="Description"><p className={cn("text-xs text-ink-body-light mt-0.5 leading-relaxed")}>{fn.description}</p></DocField>
        <DocField label="Signature">
          <div className={cn("mt-1 p-2 rounded-md bg-surface-primary border border-line font-mono text-xs text-ink-body")}>{fn.signature}</div>
        </DocField>
        <DocField label="Returns"><div className={cn("mt-0.5")}>{getReturnTypeBadge(fn.returnType)}</div></DocField>
        <DocField label="Examples">
          <div className={cn("mt-1 space-y-1.5")}>
            {fn.examples.map((ex, i) => <ExampleBlock key={i} code={ex} onInsert={insertAtCursor} />)}
          </div>
        </DocField>
        <DocField label="Category"><p className={cn("text-xs text-ink-secondary mt-0.5")}>{fn.category}</p></DocField>
      </div>
    </>
  );
}

function DocField({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div>
      <span className={cn("text-[11px] font-semibold text-ink-muted uppercase")}>{label}</span>
      {children}
    </div>
  );
}
