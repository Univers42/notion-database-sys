// ─── AskAiWidgetButton — hands what a widget shows to the host's assistant ───
// Drawn only when the host passes `onAskAI`: the host decides whether its AI
// is on. Nothing is sent from here; the host puts the text in its composer.

import React from 'react';
import { Sparkles } from 'lucide-react';
import { useHostAdapters } from '../../../../hooks/useHostAdapters';
import { useViewPages } from '../../../../hooks/useViewPages';
import { useDatabaseStore } from '../../../../store/dbms/hardcoded/useDatabaseStore';
import type { DashboardViewWidget } from '../../../../types/database';
import type { ChartResult } from '../../../../lib/chart/chartTypes';
import { widgetQuote } from './model/widgetSnapshot';
import { cn } from '../../../../utils/cn';

type AskAI = (request: { title: string; text: string }) => void;

interface AskAiWidgetProps {
  widget: DashboardViewWidget;
  title: string;
  /** What the widget's chart drew, filled by its ChartView. */
  chartResult: { readonly current: ChartResult | null };
}

function AskAiButton({ widget, title, chartResult, onAskAI }: Readonly<AskAiWidgetProps & { onAskAI: AskAI }>) {
  const pages = useViewPages(widget.viewId);
  const view = useDatabaseStore(s => s.views[widget.viewId]);
  const properties = useDatabaseStore(s => (view ? s.databases[view.databaseId]?.properties : undefined));
  const getPageTitle = useDatabaseStore(s => s.getPageTitle);
  const getCellValue = useDatabaseStore(s => s.getCellValue);
  if (!view || !properties) return null;
  const askAI = () => onAskAI({
    title,
    text: widgetQuote({
      widget,
      view,
      properties,
      pages,
      chartResult: chartResult.current,
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

export function AskAiWidgetButton(props: Readonly<AskAiWidgetProps>) {
  const { onAskAI } = useHostAdapters();
  return onAskAI ? <AskAiButton {...props} onAskAI={onAskAI} /> : null;
}
