/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   AutomationsSheet.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDatabaseStore, useStoreApi } from '../../store/dbms/hardcoded/useDatabaseStore';
import { databaseRules } from '../../store/slices/pageAutomations';
import { blankRule, draftProblems } from './ruleDraft';
import { ruleSentence } from './ruleSentence';
import { ruleTemplates } from './ruleTemplates';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { RuleEditor } from './RuleEditor';
import { parseLiveDatabaseId } from '../../store/live/liveTypes';
import type { AutomationRuleV2 } from '../../types/database';
import { cn } from '../../utils/cn';

interface Props {
  databaseId: string;
  anchorRef?: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}

const ctx = () => ({ newId: () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)), ownerId: null, now: new Date().toISOString() });

export function AutomationsSheet({ databaseId, anchorRef, onClose }: Readonly<Props>) {
  const store = useStoreApi();
  const databases = useDatabaseStore((s) => s.databases);
  const database = databases[databaseId];
  const properties = database?.properties ?? {};
  const [rules, setRules] = useState<AutomationRuleV2[]>(() => (databaseRules(store.getState(), databaseId) as AutomationRuleV2[]).map((r) => ({ ...r })));
  const [editing, setEditing] = useState<AutomationRuleV2 | null>(null);
  const [originalId, setOriginalId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDialogElement>(null);

  const persist = (next: AutomationRuleV2[]) => {
    store.getState().saveDatabaseAutomations(databaseId, next);
    setRules(next.map((r) => ({ ...r })));
  };

  const templates = database ? ruleTemplates(database, ctx()) : [];

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => { anchorRef?.current?.focus(); };
  }, [anchorRef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showDiscard) { setShowDiscard(false); return; }
      if (editing) {
        if (dirty) setShowDiscard(true);
        else setEditing(null);
      } else if (deleteId) {
        setDeleteId(null);
      } else {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editing, dirty, deleteId, showDiscard, onClose]);

  const openNew = () => {
    const rule = blankRule(ctx());
    // A new automation opens with one empty step so the editor is never blank;
    // it is still not saved until Save.
    rule.program = { version: 1, steps: [{ op: 'action', action: { type: 'notify', message: '' } }] };
    setEditing(rule);
    setOriginalId(null);
    setDirty(false);
  };

  const openEdit = (rule: AutomationRuleV2) => {
    setEditing({ ...rule });
    setOriginalId(rule.id);
    setDirty(false);
  };

  const openTemplate = (template: { build?: () => AutomationRuleV2 }) => {
    if (!template.build) return;
    setEditing(template.build());
    setOriginalId(null);
    setDirty(false);
  };

  const handleSave = () => {
    if (!editing) return;
    const problems = draftProblems(editing, properties);
    if (problems.length > 0) return;
    const nextRule: AutomationRuleV2 = { ...editing, updatedAt: new Date().toISOString() };
    let next = [...rules];
    if (originalId) next = next.map((r) => (r.id === originalId ? nextRule : r));
    else next = [...next, nextRule];
    persist(next);
    setEditing(null);
    setDirty(false);
  };

  const handleToggle = (rule: AutomationRuleV2, checked: boolean) => {
    const next = rules.map((r) => (r.id === rule.id ? { ...r, enabled: checked } : r));
    persist(next);
  };

  const handleDelete = (id: string) => {
    const next = rules.filter((r) => r.id !== id);
    persist(next);
    setDeleteId(null);
  };

  const problems = editing ? draftProblems(editing, properties) : [];

  const content = (
    <dialog
      open
      ref={containerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="automations-sheet-heading"
      className={cn('fixed top-0 right-0 z-[9999] m-0 flex h-full w-full flex-col bg-surface-primary shadow-xl outline-none sm:w-[420px] motion-reduce:transition-none')}
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 id="automations-sheet-heading" className="text-lg font-semibold text-ink">Automations</h2>
        <button type="button" onClick={onClose} aria-label="Close automations" className="min-h-8 rounded-md px-2 text-ink-muted hover:text-ink">Close</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {editing ? (
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-medium text-ink">Edit automation</h3>
            <RuleEditor rule={editing} properties={properties} onChange={(next) => { setEditing(next); setDirty(true); }} />
            <div role="status" className="flex flex-col gap-1 text-xs text-ink-muted">
              {problems.map((p, i) => <span key={i}>{p}</span>)}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setEditing(null); setDirty(false); }} className="min-h-8 rounded-md border border-line px-3 py-1 text-sm">Cancel</button>
              <button type="button" onClick={handleSave} disabled={problems.length > 0} className="min-h-8 rounded-md bg-accent px-3 py-1 text-sm text-ink-inverse disabled:opacity-40">Save</button>
            </div>
            {showDiscard && (
              <div className="rounded-md border border-line p-3">
                <p className="text-sm text-ink">Discard unsaved changes?</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => setShowDiscard(false)} className="min-h-8 rounded-md border border-line px-3 py-1 text-sm">Keep editing</button>
                  <button type="button" onClick={() => { setEditing(null); setDirty(false); setShowDiscard(false); onClose(); }} className="min-h-8 rounded-md bg-danger px-3 py-1 text-sm text-ink-inverse">Discard</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rules.length === 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-ink-muted">No automations yet.</p>
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    disabled={!template.build}
                    onClick={() => openTemplate(template)}
                    className="min-h-8 rounded-md border border-line px-3 py-2 text-left text-sm disabled:opacity-50"
                  >
                    <span className="block font-medium text-ink">{template.title}</span>
                    {template.unavailable && <span className="block text-xs text-ink-muted">{template.unavailable}</span>}
                    <span className="block text-xs text-ink-muted">{template.description}</span>
                  </button>
                ))}
              </div>
            )}
            {rules.map((rule) => (
              <div key={rule.id} className="flex flex-col gap-2 rounded-md border border-line p-3">
                <p className="text-sm text-ink">{ruleSentence(rule, properties)}</p>
                <div className="flex items-center gap-2">
                  <ToggleSwitch
                    checked={rule.enabled}
                    onChange={(checked) => handleToggle(rule, checked)}
                    label={`Turn ${rule.name || 'automation'} on/off`}
                  />
                  <button type="button" onClick={() => openEdit(rule)} className="min-h-8 rounded-md border border-line px-2 text-sm">Edit</button>
                  <button type="button" onClick={() => setDeleteId(rule.id)} className="min-h-8 rounded-md border border-line px-2 text-sm">Delete</button>
                </div>
                {deleteId === rule.id && (
                  <div className="rounded-md border border-line p-2">
                    <p className="text-sm text-ink">Delete {rule.name}?</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => setDeleteId(null)} className="min-h-8 rounded-md border border-line px-3 py-1 text-sm">Cancel</button>
                      <button type="button" onClick={() => handleDelete(rule.id)} className="min-h-8 rounded-md bg-danger px-3 py-1 text-sm text-ink-inverse">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button type="button" onClick={openNew} className="min-h-8 self-start rounded-md bg-accent px-3 py-2 text-sm text-ink-inverse">+ New automation</button>
          </div>
        )}
      </div>
    </dialog>
  );

  return createPortal(content, document.body);
}