import { Icon } from './Icon';

// ═══════════════════════════════════════════════════════════════════════════════
// Notion-authentic UI SVG icons — thin wrappers around the centralized Icon registry.
// Each icon renders at its default size. Pass className to override.
// ═══════════════════════════════════════════════════════════════════════════════

interface IconProps {
  className?: string;
}

export function TableIcon({ className = 'w-[22px] h-[22px]' }: IconProps) {
  return <Icon name="ui/table" className={className} />;
}
export function BoardIcon({ className = 'w-[22px] h-[22px]' }: IconProps) {
  return <Icon name="ui/board" className={className} />;
}
export function GalleryIcon({ className = 'w-[22px] h-[22px]' }: IconProps) {
  return <Icon name="ui/gallery" className={className} />;
}
export function ListIcon({ className = 'w-[22px] h-[22px]' }: IconProps) {
  return <Icon name="ui/list" className={className} />;
}
export function ChartIcon({ className = 'w-[22px] h-[22px]' }: IconProps) {
  return <Icon name="ui/chart" className={className} />;
}
export function DashboardIcon({ className = 'w-[22px] h-[22px]' }: IconProps) {
  return <Icon name="ui/dashboard" className={className} />;
}
export function TimelineIcon({ className = 'w-[22px] h-[22px]' }: IconProps) {
  return <Icon name="ui/timeline" className={className} />;
}
export function FeedIcon({ className = 'w-[22px] h-[22px]' }: IconProps) {
  return <Icon name="ui/feed" className={className} />;
}
export function MapViewIcon({ className = 'w-[22px] h-[22px]' }: IconProps) {
  return <Icon name="ui/map-view" className={className} />;
}
export function CalendarIcon({ className = 'w-[22px] h-[22px]' }: IconProps) {
  return <Icon name="ui/calendar" className={className} />;
}
export function CopyLinkIcon({ className = 'w-[18px] h-[18px]' }: IconProps) {
  return <Icon name="ui/copy-link" className={className} />;
}
export function DuplicateIcon({ className = 'w-[18px] h-[18px]' }: IconProps) {
  return <Icon name="ui/duplicate" className={className} />;
}
export function ExternalLinkIcon({ className = 'w-[18px] h-[18px]' }: IconProps) {
  return <Icon name="ui/external-link" className={className} />;
}
export function PencilIcon({ className = 'w-[18px] h-[18px]' }: IconProps) {
  return <Icon name="ui/pencil" className={className} />;
}
export function EmojiFaceIcon({ className = 'w-[18px] h-[18px]' }: IconProps) {
  return <Icon name="ui/emoji-face" className={className} />;
}
export function LayoutIcon({ className = 'w-[18px] h-[18px]' }: IconProps) {
  return <Icon name="ui/layout" className={className} />;
}
export function EyeSlashIcon({ className = 'w-[18px] h-[18px]' }: IconProps) {
  return <Icon name="ui/eye-slash" className={className} />;
}
export function NewDataSourceIcon({ className = 'w-[18px] h-[18px]' }: IconProps) {
  return <Icon name="ui/new-data-source" className={className} />;
}
export function EyeIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/eye" className={className} />;
}
export function FilterIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/filter" className={className} />;
}
export function SortIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/sort" className={className} />;
}
export function GroupIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/group" className={className} />;
}
export function ConditionalColorIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/conditional-color" className={className} />;
}
export function SourceIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/source" className={className} />;
}
export function LightningIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/lightning" className={className} />;
}
export function EllipsisIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/ellipsis" className={className} />;
}
export function CollectionIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/collection" className={className} />;
}
export function LockIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/lock" className={className} />;
}
export function CloseIcon({ className = 'w-4 h-4' }: IconProps) {
  return <Icon name="ui/close" className={className} />;
}
export function ChevronRightIcon({ className = 'w-[14px] h-[14px]' }: IconProps) {
  return <Icon name="ui/chevron-right" className={className} />;
}
export function InfoCircleIcon({ className = 'w-[14px] h-[14px]' }: IconProps) {
  return <Icon name="ui/info-circle" className={className} />;
}
export function ChevronLeftIcon({ className = 'w-[14px] h-[14px]' }: IconProps) {
  return <Icon name="ui/chevron-left" className={className} />;
}
export function GripHandleIcon({ className = 'w-[18px] h-[18px]' }: IconProps) {
  return <Icon name="ui/grip-handle" className={className} />;
}
export function ArrowSquarePathIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/arrow-square-path" className={className} />;
}
export function StarIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/star" className={className} />;
}
export function ComposeIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/compose" className={className} />;
}
export function ArrowMergeUpIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/arrow-merge-up" className={className} />;
}
export function ArrowExpandDiagonalIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/arrow-expand-diagonal" className={className} />;
}
export function ArrowDiagonalUpRightIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/arrow-diagonal-up-right" className={className} />;
}
export function PeekSideIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/peek-side" className={className} />;
}
export function ArrowTurnUpRightIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/arrow-turn-up-right" className={className} />;
}
export function TrashIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/trash" className={className} />;
}
export function AiFaceIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/ai-face" className={className} />;
}
export function QuestionMarkCircleIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/question-mark-circle" className={className} />;
}
export function VerticalBarChartIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/vertical-bar-chart" className={className} />;
}
export function HorizontalBarChartIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/horizontal-bar-chart" className={className} />;
}
export function LineChartIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/line-chart" className={className} />;
}
export function DonutChartIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/donut-chart" className={className} />;
}
export function NumberIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/number" className={className} />;
}
export function ArrowTurnDownRightIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/arrow-turn-down-right" className={className} />;
}
export function ArrowTurnLeftUpIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/arrow-turn-left-up" className={className} />;
}
export function RectangleSplitIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/rectangle-split" className={className} />;
}
export function ArrowUpDownStackedIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/arrow-up-down-stacked" className={className} />;
}
export function DottedLineIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/dotted-line" className={className} />;
}
export function PaintPaletteIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/paint-palette" className={className} />;
}
export function PaintBrushIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/paint-brush" className={className} />;
}
export function ArrowLineDownIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/arrow-line-down" className={className} />;
}
export function LinkIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/link" className={className} />;
}
export function PathRoundEndsIcon({ className = 'w-5 h-5' }: IconProps) {
  return <Icon name="ui/path-round-ends" className={className} />;
}
export function ArrowUpDownRotatedIcon({ className = 'w-4 h-4' }: IconProps) {
  return <Icon name="ui/arrow-up-down-rotated" className={className} style={{ transform: 'rotate(-90deg)' }} />;
}
