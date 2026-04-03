/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   iconRegistry.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:14 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:36:40 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export interface IconDef {
  /** SVG inner markup — <path> elements */
  d: string;
  /** Optional viewBox override (default: "0 0 20 20") */
  viewBox?: string;
}

import { ICON_REGISTRY_A } from './iconRegistryA';
import { ICON_REGISTRY_B } from './iconRegistryB';

/** Merged icon registry combining all partitions. */
export const ICON_REGISTRY: Record<string, IconDef> = {
  ...ICON_REGISTRY_A,
  ...ICON_REGISTRY_B,
};

/** All registered icon keys. */
export const ICON_NAMES = Object.keys(ICON_REGISTRY);
/** Icon keys available in the user-facing picker (excludes `ui/*`). */
export const PICKER_ICON_NAMES = ICON_NAMES.filter(k => !k.startsWith('ui/'));
/** Icon keys reserved for application chrome (`ui/*` namespace). */
export const UI_ICON_NAMES = ICON_NAMES.filter(k => k.startsWith('ui/'));
/** Total number of registered icons. */
export const ICON_COUNT = ICON_NAMES.length;
