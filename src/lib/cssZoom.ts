// A host may zoom a pane with CSS zoom. Pointers and rects then report on-screen px
// while widths and offsets written to `style` stay CSS px, so a drag distance has
// to be divided by this factor or the edge runs ahead of the pointer.

/** On-screen px per CSS px inside `element`; 1 where the browser has no CSS zoom. */
export function cssZoomOf(element: Element | null | undefined): number {
  const zoom = (element as { currentCSSZoom?: number } | null | undefined)?.currentCSSZoom;
  return zoom && zoom > 0 ? zoom : 1;
}
