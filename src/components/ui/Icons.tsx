/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Icons.tsx                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:17 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 19:40:54 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { Icon } from './Icon';
import { cn } from '../../utils/cn';

// ═══════════════════════════════════════════════════════════════════════════════
// Notion-authentic UI SVG icons — thin wrappers around the centralized Icon registry.
// Each icon renders at its default size. Pass className to override.
// ═══════════════════════════════════════════════════════════════════════════════

interface IconProps {
  className?: string;
}

export function TableIcon({ className = 'w-[22px] h-[22px]' }: Readonly<IconProps>) {
  return <Icon name="ui/table" className={className} />;
}
export function BoardIcon({ className = 'w-[22px] h-[22px]' }: Readonly<IconProps>) {
  return <Icon name="ui/board" className={className} />;
}
export function GalleryIcon({ className = 'w-[22px] h-[22px]' }: Readonly<IconProps>) {
  return <Icon name="ui/gallery" className={className} />;
}
export function ListIcon({ className = 'w-[22px] h-[22px]' }: Readonly<IconProps>) {
  return <Icon name="ui/list" className={className} />;
}
export function ChartIcon({ className = 'w-[22px] h-[22px]' }: Readonly<IconProps>) {
  return <Icon name="ui/chart" className={className} />;
}
export function DashboardIcon({ className = 'w-[22px] h-[22px]' }: Readonly<IconProps>) {
  return <Icon name="ui/dashboard" className={className} />;
}
export function TimelineIcon({ className = 'w-[22px] h-[22px]' }: Readonly<IconProps>) {
  return <Icon name="ui/timeline" className={className} />;
}
export function FeedIcon({ className = 'w-[22px] h-[22px]' }: Readonly<IconProps>) {
  return <Icon name="ui/feed" className={className} />;
}
export function MapViewIcon({ className = 'w-[22px] h-[22px]' }: Readonly<IconProps>) {
  return <Icon name="ui/map-view" className={className} />;
}
export function CalendarIcon({ className = 'w-[22px] h-[22px]' }: Readonly<IconProps>) {
  return <Icon name="ui/calendar" className={className} />;
}
export function CopyLinkIcon({ className = 'w-[18px] h-[18px]' }: Readonly<IconProps>) {
  return <Icon name="ui/copy-link" className={className} />;
}
export function DuplicateIcon({ className = 'w-[18px] h-[18px]' }: Readonly<IconProps>) {
  return <Icon name="ui/duplicate" className={className} />;
}
export function ExternalLinkIcon({ className = 'w-[18px] h-[18px]' }: Readonly<IconProps>) {
  return <Icon name="ui/external-link" className={className} />;
}
export function PencilIcon({ className = 'w-[18px] h-[18px]' }: Readonly<IconProps>) {
  return <Icon name="ui/pencil" className={className} />;
}
export function EmojiFaceIcon({ className = 'w-[18px] h-[18px]' }: Readonly<IconProps>) {
  return <Icon name="ui/emoji-face" className={className} />;
}
export function LayoutIcon({ className = 'w-[18px] h-[18px]' }: Readonly<IconProps>) {
  return <Icon name="ui/layout" className={className} />;
}
export function EyeSlashIcon({ className = 'w-[18px] h-[18px]' }: Readonly<IconProps>) {
  return <Icon name="ui/eye-slash" className={className} />;
}
export function NewDataSourceIcon({ className = 'w-[18px] h-[18px]' }: Readonly<IconProps>) {
  return <Icon name="ui/new-data-source" className={className} />;
}
export function EyeIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/eye" className={className} />;
}
export function FilterIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/filter" className={className} />;
}
export function SortIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/sort" className={className} />;
}
export function GroupIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/group" className={className} />;
}
export function ConditionalColorIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/conditional-color" className={className} />;
}
export function SourceIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/source" className={className} />;
}
export function LightningIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/lightning" className={className} />;
}
export function EllipsisIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/ellipsis" className={className} />;
}
export function CollectionIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/collection" className={className} />;
}
export function LockIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/lock" className={className} />;
}
export function CloseIcon({ className = 'w-4 h-4' }: Readonly<IconProps>) {
  return <Icon name="ui/close" className={className} />;
}
export function ChevronRightIcon({ className = 'w-[14px] h-[14px]' }: Readonly<IconProps>) {
  return <Icon name="ui/chevron-right" className={className} />;
}
export function InfoCircleIcon({ className = 'w-[14px] h-[14px]' }: Readonly<IconProps>) {
  return <Icon name="ui/info-circle" className={className} />;
}
export function ChevronLeftIcon({ className = 'w-[14px] h-[14px]' }: Readonly<IconProps>) {
  return <Icon name="ui/chevron-left" className={className} />;
}
export function GripHandleIcon({ className = 'w-[18px] h-[18px]' }: Readonly<IconProps>) {
  return <Icon name="ui/grip-handle" className={className} />;
}

export * from './IconsExtra';
