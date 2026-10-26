/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   virtualScroll.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/26 23:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/26 23:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { observeElementOffset, type Virtualizer } from '@tanstack/react-virtual';

/**
 * observeElementOffset that first reports where the scroller already is.
 * virtual-core (3.14) scrolls a scroller it attaches to to its cached offset,
 * which is 0 because it was read before attaching. An inline table or board
 * attaches to the PAGE scroller, so switching to that view threw the reader
 * back to the top of the page.
 */
export function observeCurrentElementOffset<T extends Element, I extends Element>(
  instance: Virtualizer<T, I>,
  cb: (offset: number, isScrolling: boolean) => void,
) {
  const el = instance.scrollElement;
  if (el) cb(instance.options.horizontal ? el.scrollLeft : el.scrollTop, false);
  return observeElementOffset(instance, cb);
}
