/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PropertyIconButton.tsx                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:36:51 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef } from 'react';
import { useDatabaseStore } from '../../store/dbms/hardcoded/useDatabaseStore';
import type { SchemaProperty } from '../../types/database';
import { IconPickerPopover } from '../ui/IconPickerPopover';
import { Icon } from '../ui/Icon';
import { DEFAULT_PROPERTY_ICONS } from './constants';
import { cn } from '../../utils/cn';

/** Renders a clickable button that opens an icon picker to change a property's icon. */
export function PropertyIconButton({ property, databaseId }: Readonly<{ property: SchemaProperty; databaseId: string }>) {
  const [showPicker, setShowPicker] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const { updateProperty } = useDatabaseStore();

  const currentIconName = property.icon || DEFAULT_PROPERTY_ICONS[property.type] || 'type';

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setShowPicker(!showPicker); }}
        className={cn("p-1.5 rounded-md hover:bg-hover-surface2 text-ink-muted transition-colors")}
        title="Change icon"
      >
        <Icon name={currentIconName} className={cn("w-4 h-4 text-ink-muted")} />
      </button>
      {showPicker && (
        <IconPickerPopover
          anchorRef={btnRef}
          value={property.icon || null}
          onSelect={(name) => {
            updateProperty(databaseId, property.id, { icon: name });
            setShowPicker(false);
          }}
          onRemove={() => {
            updateProperty(databaseId, property.id, { icon: undefined });
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
