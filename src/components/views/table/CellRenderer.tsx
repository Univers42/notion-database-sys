/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CellRenderer.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:45 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 01:19:23 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// Cell content renderer — maps property type → React node
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { SchemaProperty, Page, PropertyValue } from '../../../types/database';
import {
  renderTitleOrText,
  renderNumber,
  renderCheckbox,
  renderDate,
  renderPerson,
  renderEmailUrlPhone,
  renderPlace,
  renderId,
  renderTimestamp,
  renderUserMeta,
  renderSelect,
  renderStatus,
  renderMultiSelect,
  renderFormula,
  renderRollup,
  renderRelation,
  renderAssignedTo,
  renderFilesMedia,
  renderButton,
  renderDueDate,
  renderCustom,
} from './cellRenderers';
import { cn } from '../../../utils/cn';

export interface CellRendererProps {
  prop: SchemaProperty;
  page: Page;
  value: PropertyValue;
  isEditing: boolean;
  wrapContent: boolean;
  databaseId: string;
  onUpdate: (pageId: string, propId: string, value: PropertyValue) => void;
  onStopEditing: () => void;
  onOpenPage: (pageId: string) => void;
  onFormulaEdit: (propId: string) => void;
  onPropertyConfig: (prop: SchemaProperty, position: { top: number; left: number }) => void;
  tableRef: React.RefObject<HTMLDivElement | null>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main dispatcher
// ═══════════════════════════════════════════════════════════════════════════════

export function renderCellContent(props: CellRendererProps): React.ReactNode {
  const { prop, value, page, wrapContent } = props;
  switch (prop.type) {
    case 'title':
    case 'text':            return renderTitleOrText(props);
    case 'number':          return renderNumber(props);
    case 'select':          return renderSelect(props);
    case 'status':          return renderStatus(props);
    case 'multi_select':    return renderMultiSelect(props);
    case 'date':            return renderDate(props);
    case 'checkbox':        return renderCheckbox(value);
    case 'person':
    case 'user':            return renderPerson(props);
    case 'email':
    case 'url':
    case 'phone':           return renderEmailUrlPhone(props);
    case 'place':           return renderPlace(props);
    case 'id':              return renderId(value);
    case 'files_media':     return renderFilesMedia(value);
    case 'button':          return renderButton(prop);
    case 'formula':         return renderFormula(props);
    case 'rollup':          return renderRollup(props);
    case 'relation':        return renderRelation(props);
    case 'assigned_to':     return renderAssignedTo(value, wrapContent);
    case 'due_date':        return renderDueDate(props);
    case 'custom':          return renderCustom(props);
    case 'created_time':
    case 'last_edited_time': return renderTimestamp(prop, page);
    case 'created_by':
    case 'last_edited_by':  return renderUserMeta(prop, page);
    default:                return <span className={cn("text-sm text-ink-secondary truncate block")}>{String(value || '')}</span>;
  }
}
