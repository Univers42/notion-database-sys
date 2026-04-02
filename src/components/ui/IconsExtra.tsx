/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   IconsExtra.tsx                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:37:26 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 14:37:27 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { Icon } from './Icon';

interface IconProps {
  className?: string;
}

export function ArrowSquarePathIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/arrow-square-path" className={className} />;
}
export function StarIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/star" className={className} />;
}
export function ComposeIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/compose" className={className} />;
}
export function ArrowMergeUpIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/arrow-merge-up" className={className} />;
}
export function ArrowExpandDiagonalIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/arrow-expand-diagonal" className={className} />;
}
export function ArrowDiagonalUpRightIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/arrow-diagonal-up-right" className={className} />;
}
export function PeekSideIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/peek-side" className={className} />;
}
export function ArrowTurnUpRightIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/arrow-turn-up-right" className={className} />;
}
export function TrashIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/trash" className={className} />;
}
export function AiFaceIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/ai-face" className={className} />;
}
export function QuestionMarkCircleIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/question-mark-circle" className={className} />;
}
export function VerticalBarChartIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/vertical-bar-chart" className={className} />;
}
export function HorizontalBarChartIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/horizontal-bar-chart" className={className} />;
}
export function LineChartIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/line-chart" className={className} />;
}
export function DonutChartIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/donut-chart" className={className} />;
}
export function NumberIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/number" className={className} />;
}
export function ArrowTurnDownRightIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/arrow-turn-down-right" className={className} />;
}
export function ArrowTurnLeftUpIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/arrow-turn-left-up" className={className} />;
}
export function RectangleSplitIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/rectangle-split" className={className} />;
}
export function ArrowUpDownStackedIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/arrow-up-down-stacked" className={className} />;
}
export function DottedLineIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/dotted-line" className={className} />;
}
export function PaintPaletteIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/paint-palette" className={className} />;
}
export function PaintBrushIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/paint-brush" className={className} />;
}
export function ArrowLineDownIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/arrow-line-down" className={className} />;
}
export function LinkIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/link" className={className} />;
}
export function PathRoundEndsIcon({ className = 'w-5 h-5' }: Readonly<IconProps>) {
  return <Icon name="ui/path-round-ends" className={className} />;
}
export function ArrowUpDownRotatedIcon({ className = 'w-4 h-4' }: Readonly<IconProps>) {
  return <Icon name="ui/arrow-up-down-rotated" className={className} style={{ transform: 'rotate(-90deg)' }} />;
}
