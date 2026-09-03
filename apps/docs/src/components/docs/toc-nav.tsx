/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

'use client';

/**
 * The table of contents, inside a navigation landmark.
 *
 * fumadocs renders the TOC as a bare `<div id="nd-toc">`. Until 16.14.5 that
 * did not matter here: this app wrapped the whole docs page in its own
 * `<main id="main-content">`, which covered the TOC along with everything else.
 *
 * 16.14.5 added a `<main>` of its own — but it wraps only the `<article>`, so
 * the app's wrapper had to become a plain `div` to avoid two landmarks, and
 * that left the TOC outside every landmark. axe's `region` rule caught it:
 * "All page content should be contained by landmarks".
 *
 * Wrapping it in `<nav>` is the fix and also the more correct markup — a table
 * of contents IS navigation, and the accessible name lets a screen-reader user
 * tell it apart from the sidebar's document tree.
 */
import type { ComponentProps } from 'react';
import { TOC } from 'fumadocs-ui/layouts/docs/page/slots/toc';

export function TocNav(props: ComponentProps<typeof TOC>) {
  return (
    // `contents` is load-bearing, not cosmetic. The docs page is a CSS grid
    // and the stock `#nd-toc` places itself with `[grid-area:toc]` — but
    // grid-area only works on DIRECT grid children. A plain <nav> wrapper
    // becomes the grid child instead: unstyled, auto-placed into the first
    // free cell, where it rendered as a full-height block overlapping the
    // article on every xl+ viewport (the TOC is `max-xl:hidden`, which is
    // why small screens never showed it). `display: contents` removes the
    // nav's box so `#nd-toc` is the grid item again, while the navigation
    // landmark and its accessible name stay exposed — verified with axe
    // (0 violations, `region` included) at 1728×1117.
    <nav className="contents" aria-label="On this page">
      <TOC {...props} />
    </nav>
  );
}
