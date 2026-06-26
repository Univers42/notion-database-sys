/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useDefaultTemplateCreate.ts                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/26 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/26 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useTemplatesController } from '../topBar/templatesContext';

/**
 * Wrap a database's blank "+ New" create so it honors the DEFAULT template when
 * the host has set one (Notion parity: every generic New affordance seeds from
 * the default, not just the top-bar split button). Falls back to the caller's
 * blank create when there is no templates controller (live / standalone DBs) or
 * no default is set — so those paths are byte-for-byte unchanged.
 *
 * Only the generic footer "+ New" buttons use this; context-specific creates
 * (board column, calendar day, timeline start) keep passing their pre-fill
 * properties and stay on the blank path.
 */
export function useDefaultTemplateCreate(blankCreate: () => void): () => void {
  const templates = useTemplatesController();
  return () => {
    const defaultTemplate = templates?.list.find((t) => t.isDefault);
    if (templates && defaultTemplate) {
      templates.onCreateFrom(defaultTemplate.id);
      return;
    }
    blankCreate();
  };
}
