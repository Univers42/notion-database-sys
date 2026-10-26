// ─── AskAiWidgetButton — hands what a widget shows to the host's assistant ───
// Drawn only when the host passes `onAskAI`: the host decides whether its AI
// is on. Nothing is sent from here; the host puts the text in its composer.

import React from 'react';
import { Sparkles } from 'lucide-react';
import { useHostAdapters } from '../../../../hooks/useHostAdapters';
import { useViewPages } from '../../../../hooks/useViewPages';
import { useDatabaseStore } from '../../../../store/dbms/hardcoded/useDatabaseStore';
import { widgetSnapshot } from './model/widgetSnapshot';
import { cn } from '../../../../utils/cn';

type AskAI = (request: { title: string; text: string }) => void;

function AskAiButton({ viewId, title, onAskAI }: Readonly<{ viewId: string; title: string; onAskAI: AskAI }>) {
  const pages = useViewPages(viewId);
  const view = useDatabaseStore(s => s.views[viewId]);
  const properties = useDatabaseStore(s => (view ? s.databases[view.databaseId]?.properties : undefined));
  const getPageTitle = useDatabaseStore(s => s.getPageTitle);
  const getCellValue = useDatabaseStore(s => s.getCellValue);
  if (!view || !properties) return null;
  const askAI = () => onAskAI({
    title,
    text: widgetSnapshot({
      visibleProperties: view.visibleProperties,
      properties,
      records: pages,
      titleOf: getPageTitle,
      valueOf: getCellValue,
    }),
  });
  return (
    <button type="button" onClick={askAI} aria-label={`Ask AI about ${title}`} title="Ask AI"
      className={cn("shrink-0 p-0.5 rounded text-ink-muted hover:bg-hover-surface hover:text-ink opacity-0 transition-opacity group-hover/widget:opacity-100 focus-visible:opacity-100")}>
      <Sparkles className={cn("w-3.5 h-3.5")} />
    </button>
  );
}

export function AskAiWidgetButton({ viewId, title }: Readonly<{ viewId: string; title: string }>) {
  const { onAskAI } = useHostAdapters();
  return onAskAI ? <AskAiButton viewId={viewId} title={title} onAskAI={onAskAI} /> : null;
}
