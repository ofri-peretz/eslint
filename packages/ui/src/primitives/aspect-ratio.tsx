/**
 * @interlace/ui — AspectRatio
 *
 * Anatomy: a single block-level wrapper that reserves space by ratio (CSS
 * `aspect-ratio`) and stretches to the parent's width. Use it as the *frame*
 * for media that arrives async (images, video, embeds, charts) so the
 * surrounding layout never shifts (DESIGN_PRINCIPLES #7 "CLS = 0 from
 * layout"). Children fill the frame absolutely or with `object-cover` on
 * `<img>` / `<video>`.
 *
 * | Rule | Concept                          | Where in this file                                   |
 * | ---- | -------------------------------- | ---------------------------------------------------- |
 * | R4   | Extends native el                | `React.ComponentProps<'div'>`                        |
 * | R6   | data-slot on the part            | `data-slot="aspect-ratio"`                           |
 * | R7   | className merged + ...rest + ref | `cn('relative w-full', className)` + `{...props}` + `forwardRef` |
 * | R11  | One variable                     | One layout variable: `ratio` (number)                |
 * | R18  | Tailwind only — except aspect-ratio | Inline `style={{ aspectRatio: ratio }}` is unavoidable here — Tailwind has no class for an arbitrary runtime ratio short of `aspect-[w/h]` JIT, which can't accept a runtime number. This is the documented carve-out. |
 * | R19  | Tokens only                      | No color/spacing/radius/type — pure layout primitive  |
 * | R25  | Server component                 | No hooks; safe inside any RSC tree                   |
 *
 * MIN_VIEWPORT = 320 — pure CSS aspect-ratio works at every viewport; the
 * frame just scales to whatever width the parent offers. The 320px floor is
 * the design-system baseline for "smallest viable viewport" (iPhone SE
 * portrait); below it, preflight's `body[data-interlace-dev]` outline warns.
 *
 * API parity: Radix / shadcn `AspectRatio` (`ratio` number). Native CSS
 * `aspect-ratio` has 95%+ global support (caniuse, 2026), so this primitive
 * is a single `<div>` — no padding-bottom hack, no extra wrapper.
 */

import * as React from 'react';

import { cn } from '../lib/cn.js';

/** Smallest viable viewport this primitive supports (px). */
export const MIN_VIEWPORT = 320;

interface AspectRatioProps extends React.ComponentProps<'div'> {
  /** Width / height ratio (e.g. 16 / 9, 4 / 3, 1). @default 16 / 9 */
  ratio?: number;
}

/** Reserves layout space at a fixed ratio. Server component (no hooks). */
const AspectRatio = React.forwardRef<HTMLDivElement, AspectRatioProps>(
  function AspectRatio({ ratio = 16 / 9, className, style, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="aspect-ratio"
        data-min-viewport={String(MIN_VIEWPORT)}
        style={{ aspectRatio: ratio, ...style }}
        className={cn('relative w-full', className)}
        {...props}
      />
    );
  },
);
AspectRatio.displayName = 'AspectRatio';

export { AspectRatio };
export type { AspectRatioProps };
