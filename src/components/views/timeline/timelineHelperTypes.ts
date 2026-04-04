/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   timelineHelperTypes.ts                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export type ZoomLevel = 'day' | 'week' | 'month';

export interface TimelineConfig {
  cellWidth: number;
  daysToShow: number;
  rowHeight: number;
  label: (d: Date) => string;
  headerLabel: (d: Date) => string;
}

export interface BarGeometry {
  left: number;
  width: number;
  visible: boolean;
  startDay: number;
  endDay: number;
  /** true when the page actually has an end-date value set */
  hasEndDate: boolean;
  /** true when the bar represents a single point-in-time (no range) */
  isPoint: boolean;
}

export interface MonthGroup {
  label: string;
  colSpan: number;
  month: number;
  year: number;
}

export interface BarColorSet {
  /** Solid bar background class (Tailwind) */
  bg: string;
  /** Text color inside the bar */
  text: string;
  /** Raw hex used for inline styles / tooltips */
  hex: string;
}

export type BarVerbosity = 'color-only' | 'status' | 'status+dates' | 'full';
