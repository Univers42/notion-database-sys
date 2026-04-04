/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   BasicCellRenderers.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:45 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 10:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Barrel re-export — split into focused modules for maintainability.
 * Every symbol that was previously exported from this file is still
 * available under the same import path.
 */

export { InlineInput } from './InlineInput';
export { renderTitleOrText, renderNumber, renderEmailUrlPhone } from './TextCellRenderers';
export { DateCellEditor, renderDate } from './DateCellRenderers';
export {
  renderCheckbox,
  renderPerson,
  renderPlace,
  renderId,
  renderTimestamp,
  renderUserMeta,
} from './MetaCellRenderers';
