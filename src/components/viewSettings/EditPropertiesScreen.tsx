/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   EditPropertiesScreen.tsx                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * "Edit properties" screen: the database's full property list; a row click
 * opens the existing PropertyConfigPanel (rename / type change / delete /
 * formula / relation / rollup) anchored at the row — full reuse of the table
 * header machinery, zero new editing logic. Disabled while the database or
 * view is locked.
 */

import React from 'react';
import { useDatabaseStore } from '../../store/dbms/hardcoded/useDatabaseStore';
import { PropertyConfigPanel } from '../PropertyConfigPanel';
import { SubPanelHeader } from './SubComponents';
import { isDatabaseLocked } from '../../lib/lockGuards';
import { getPropertyTypeLabel } from '../../utils/propertyTypes';
import { cn } from '../../utils/cn';

interface EditPropertiesScreenProps {
  databaseId: string;
  viewId: string;
  onBack: () => void;
  onClose: () => void;
}

/** Property list + anchored PropertyConfigPanel editor. */
export function EditPropertiesScreen({ databaseId, viewId, onBack, onClose }: Readonly<EditPropertiesScreenProps>) {
  const { databases, addProperty } = useDatabaseStore();
  const [editing, setEditing] = React.useState<{ propertyId: string; top: number; left: number } | null>(null);
  const database = databases[databaseId];
  if (!database) return null;
  const locked = isDatabaseLocked(database);
  const properties = Object.values(database.properties);

  const openEditor = (event: React.MouseEvent, propertyId: string) => {
    if (locked) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setEditing({ propertyId, top: rect.top, left: rect.right + 8 });
  };

  return (
    <div className={cn('flex flex-col h-full')} style={{ minWidth: 290, maxWidth: 290 }}>
      <SubPanelHeader title="Edit properties" onBack={onBack} onClose={onClose} />
      {locked && (
        <p className={cn('px-4 pb-1 text-xs text-ink-muted')}>This database is locked — unlock it to edit properties.</p>
      )}
      <div className={cn('flex-1 overflow-auto px-2 pb-2 flex flex-col gap-px')} style={{ minHeight: 0 }}>
        {properties.map((property) => (
          <button key={property.id} onClick={(event) => openEditor(event, property.id)} disabled={locked}
            className={cn('w-full flex items-center gap-2 rounded-md px-2 py-[6px] text-sm transition-colors text-ink-body hover:bg-hover-surface-soft3 disabled:opacity-60')}>
            <span className={cn('flex-1 text-left truncate')}>{property.name}</span>
            <span className={cn('shrink-0 text-xs text-ink-muted')}>{getPropertyTypeLabel(property.type)}</span>
          </button>
        ))}
        <button onClick={() => { if (!locked) addProperty(databaseId, 'New property', 'text'); }} disabled={locked}
          className={cn('mt-1 w-full rounded-md px-2 py-[7px] text-left text-sm text-accent-text-soft hover:bg-hover-surface-soft2 disabled:opacity-60')}>
          + New property
        </button>
      </div>
      {editing && database.properties[editing.propertyId] && (
        <PropertyConfigPanel
          property={database.properties[editing.propertyId]}
          databaseId={databaseId}
          viewId={viewId}
          position={{ top: editing.top, left: editing.left }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
