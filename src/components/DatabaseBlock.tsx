/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DatabaseBlock.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:12 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/10 00:36:01 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useDatabaseStore } from "../store/dbms/hardcoded/useDatabaseStore";
import { DatabaseScopeProvider } from "../hooks/useDatabaseScope";
import { TopBar } from "./TopBar";
import { DatabaseView } from "./DatabaseView";
import { EngineTemplatesProvider } from "./topBar/EngineTemplatesProvider";
import { orderedDatabaseViews } from "../lib/viewOrder";
import { Plus, FileText } from "lucide-react";
import { cn } from "../utils/cn";

/** Props for {@link DatabaseBlock}. */
export interface DatabaseBlockProps {
  /** Which database to show. If omitted, uses the database of the global activeViewId. */
  databaseId?: string;
  /** Initial view to show (only used in inline mode). */
  initialViewId?: string;
  /** full = main app, fills screen. inline = embedded in page content. */
  mode?: "full" | "inline";
  /** full = database surface, inline = Notion collection-view header (title link,
   *  tabs, collapse), single-view = minimal shelf header. */
  chrome?: "full" | "inline" | "single-view";
  /** Display name used when materializing a host-minted database id. */
  databaseName?: string;
  /** Navigate to the database's origin (full-page) surface. */
  onOpenFullPage?: (target: { databaseId: string; viewId?: string; name?: string }) => void;
  /** Called after an in-store rename so the host can persist the name. */
  onDatabaseRenamed?: (databaseId: string, name: string) => void;
}

/** Renders a complete database experience (TopBar + view body) in full-page or inline mode. */
export function DatabaseBlock({
  databaseId,
  initialViewId,
  mode = "full",
  chrome = "full",
  databaseName,
  onOpenFullPage,
  onDatabaseRenamed,
}: Readonly<DatabaseBlockProps>) {
  const views = useDatabaseStore((s) => s.views);
  const databases = useDatabaseStore((s) => s.databases);
  const globalActiveViewId = useDatabaseStore((s) => s.activeViewId);
  const createInlineDatabase = useDatabaseStore((s) => s.createInlineDatabase);
  const ensureInlineDatabase = useDatabaseStore((s) => s.ensureInlineDatabase);
  const setActiveView = useDatabaseStore((s) => s.setActiveView);

  const [localViewId, setLocalViewId] = useState(initialViewId || "");
  const [collapsed, setCollapsed] = useState(false);

  // A host-minted database id (a fresh `/database` block) is unknown to the
  // adapter — materialize it with exactly the block's ids so the block works
  // instead of dead-ending on the empty state.
  const knownDb = databaseId ? Boolean(databases[databaseId]) : true;
  useEffect(() => {
    if (databaseId && !knownDb) ensureInlineDatabase(databaseId, initialViewId, databaseName);
  }, [databaseId, knownDb, initialViewId, databaseName, ensureInlineDatabase]);

  const handleCreateDatabase = useCallback(() => {
    const { viewId } = createInlineDatabase("Untitled Database");
    if (mode === "full") {
      setActiveView(viewId);
    } else {
      setLocalViewId(viewId);
    }
  }, [createInlineDatabase, mode, setActiveView]);

  // Figure out the effective viewId
  const effectiveViewId = mode === "inline" ? localViewId : globalActiveViewId;
  const view = effectiveViewId ? views[effectiveViewId] : null;

  // For inline mode with a databaseId: if the localViewId is stale, pick first view
  const dbViews = useMemo(() => {
    const targetDbId = databaseId || view?.databaseId;
    if (!targetDbId) return [];
    return orderedDatabaseViews(views, targetDbId, databases[targetDbId]?.viewOrder);
  }, [views, databases, databaseId, view?.databaseId]);

  // Auto-fix stale local viewId
  const resolvedViewId = useMemo(() => {
    if (mode === "full") return globalActiveViewId;
    if (localViewId && views[localViewId]) return localViewId;
    return dbViews[0]?.id ?? "";
  }, [mode, globalActiveViewId, localViewId, views, dbViews]);

  const resolvedView = resolvedViewId ? views[resolvedViewId] : null;
  const database = resolvedView ? databases[resolvedView.databaseId] : null;

  if (!database || !resolvedView) {
    return (
      <div
        className={cn(
          mode === "inline"
            ? "my-3 border border-line rounded-xl p-8 text-center bg-surface-primary"
            : "flex-1 flex items-center justify-center p-8",
        )}
      >
        <div className={cn("text-center text-ink-muted max-w-sm")}>
          <FileText
            className={cn("w-12 h-12 mx-auto mb-3 text-ink-disabled")}
          />
          <h3 className={cn("text-lg font-semibold text-ink-body-light mb-2")}>
            No database
          </h3>
          <p className={cn("text-sm mb-6")}>
            Get started by creating your first database.
          </p>
          <button
            onClick={handleCreateDatabase}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 bg-accent-surface text-accent-text rounded-lg hover:bg-accent-surface-hover transition-colors font-medium",
            )}
          >
            <Plus className={cn("w-4 h-4")} />
            Create Database
          </button>
        </div>
      </div>
    );
  }

  // Inline embeds track their view locally, but the instance store's
  // activeViewId must follow: the open-page surface (object_database) resolves
  // per-view settings (openPagesIn) from it. One store per instance, so this
  // never bleeds across blocks.
  const handleViewChange = mode === "inline"
    ? (id: string) => { setLocalViewId(id); setActiveView(id); }
    : undefined;
  // Both embed chromes drop the standalone card scroll panel; 'inline' adds
  // the Notion collection-view header (title link, tabs, collapse) on top.
  const embedChrome = chrome !== "full";

  if (mode === "inline") {
    return (
      <EngineTemplatesProvider database={database}>
      <DatabaseScopeProvider value={resolvedViewId}>
        <div
          className={cn(
            "my-3 border border-line rounded-xl overflow-hidden bg-surface-primary shadow-sm",
            embedChrome && "osionos-object-database-single-view",
          )}
        >
          <TopBar
            onViewChange={handleViewChange}
            variant={chrome}
            onOpenFullPage={onOpenFullPage}
            onDatabaseRenamed={onDatabaseRenamed}
            collapsed={collapsed}
            onToggleCollapsed={chrome === "inline" ? () => setCollapsed((v) => !v) : undefined}
          />
          {/* Single-view (page-embedded) DBs flow with the page: no fixed-height
              inner scroll panel — the row count (host `recordLimit`) bounds the
              height, so the embed reads as native content, not a clipped canvas. */}
          {collapsed ? null : (
            <div
              className={cn(
                embedChrome
                  ? "osionos-db-single-body overflow-visible"
                  : "max-h-[500px] overflow-auto",
              )}
            >
              <DatabaseView viewId={resolvedViewId ?? undefined} compact />
            </div>
          )}
          {embedChrome || collapsed ? null : <InlineFooter databaseId={database.id} />}
        </div>
      </DatabaseScopeProvider>
      </EngineTemplatesProvider>
    );
  }

  // Full-page mode — identical to current App layout
  return (
    <EngineTemplatesProvider database={database}>
      <div className={cn("flex-1 flex flex-col min-h-0")}>
        <TopBar variant={chrome} onDatabaseRenamed={onDatabaseRenamed} />
        <DatabaseView />
      </div>
    </EngineTemplatesProvider>
  );
}

function InlineFooter({ databaseId }: Readonly<{ databaseId: string }>) {
  const addPage = useDatabaseStore((s) => s.addPage);
  const pages = useDatabaseStore((s) => s.pages);
  const count = Object.values(pages).filter(
    (p) => p.databaseId === databaseId,
  ).length;

  return (
    <>
      <button
        onClick={() => addPage(databaseId)}
        className={cn(
          "w-full flex items-center gap-2 px-4 py-2 text-sm text-ink-muted hover:text-hover-text hover:bg-hover-surface transition-colors border-t border-line-light",
        )}
      >
        <Plus className={cn("w-4 h-4")} />
        <span>New</span>
      </button>
      <div
        className={cn(
          "px-4 py-1.5 border-t border-line-light bg-surface-secondary-soft text-xs text-ink-muted flex items-center justify-between",
        )}
      >
        <span>
          {count} {count === 1 ? "row" : "rows"}
        </span>
      </div>
    </>
  );
}
