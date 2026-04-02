/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   formulaCache.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:43:02 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:43:03 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── formulaCache — re-exports from lib/formula for backward compatibility ──

export { getCachedFormula, setCachedFormula, evictOldest } from '../lib/formula/formulaCache';
