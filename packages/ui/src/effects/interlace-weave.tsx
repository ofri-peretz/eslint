import * as React from 'react';
import { cn } from '../lib/cn.js';

/**
 * InterlaceWeave — the brand gesture as an interaction signature.
 *
 * DOWNSTREAM COPY: the canonical component lives in the interlace repo's
 * `packages/ui` (with the strand tokens from BRAND_PHILOSOPHY.md there).
 * This copy strokes this repo's `chart-1`/`chart-2` until the consumption
 * pass replaces it from the registry. Fix bugs upstream first.
 *
 * ## RFC (R3)
 *
 * Two thin strands — brand orange (`strand-a`) and its cool complement (`strand-b`),
 * the mark's own pair — draw along a surface's border from OPPOSITE
 * corners on hover/focus and overshoot past each other where they meet:
 * the name, enacted. Decorative overlay only; the host surface keeps its
 * own semantics, focus ring, and content.
 *
 * Travel signal (R2): HIGH — designed as a system gesture (cards now;
 * CTAs, inputs, doc panels later). Ship once here, reuse everywhere: a
 * memorable touch only compounds if it is ONE touch.
 *
 * ## Mechanics
 *
 * Pure CSS/SVG — zero JS, zero bundle beyond this file. Each strand is a
 * rounded-rect path normalized with `pathLength={100}` and revealed by a
 * `stroke-dashoffset` transition driven by the host's `group/weave`
 * hover/focus variants. Strand B's path starts at the opposite corner,
 * so the two tips cross at both meeting points (the 5-unit overshoot is
 * the "weave" moment).
 *
 * The svg deliberately has NO viewBox: rect geometry is in real pixels
 * (`calc(100% − inset)`), so there is no scale transform. Two earlier
 * shapes failed in rendering: a viewBox + `preserveAspectRatio="none"`
 * needs `vector-effect: non-scaling-stroke` for uniform strokes, and
 * that makes Chromium compute dash patterns in SCREEN space — silently
 * discarding the `pathLength` normalization all the dash math rests on.
 * Unscaled geometry keeps `pathLength` honored, strokes uniform, and the
 * corner radius identical to the host's at every size.
 *
 * ## States
 *
 * - Rest: strands hidden (offset = 100).
 * - Hover: strands draw over 500ms (ease-out).
 * - Focus-within: fully drawn — the signature doubles as the affordance.
 * - Reduced motion: no transition; strands appear drawn at rest-hover
 *   states instantly (`motion-reduce:transition-none`).
 *
 * ## Host contract
 *
 * The host element must carry `group/weave` and `relative`. Example:
 *
 *   <a className="group/weave relative …">
 *     <InterlaceWeave data-testid="card-weave" />
 *     …content…
 *   </a>
 *
 * ## API parity (R17)
 *
 * Mirrors the house decorative-overlay shape (effects `BorderBeam`):
 * absolutely positioned, `aria-hidden`, `pointer-events-none` (R23
 * decorative-chrome rule). Radius follows the host via a rect `rx` that
 * matches the DS card radius token scale.
 */
export interface InterlaceWeaveProps
  extends React.ComponentPropsWithoutRef<'svg'> {
  /** Stable selector for E2E tests; consumer provides — no default (R5). */
  'data-testid': string;
  /**
   * Corner radius of the traced border, in px — match the host's radius
   * (`rounded-xl` = 12).
   * @default 12
   */
  radius?: number;
}

// Draw 55 of 100 path-units per strand — half the perimeter plus a
// 5-unit overshoot past each meeting corner; strand B runs on a
// slightly inset rect so the overlap shows two threads side by side.
const DRAWN = 'group-hover/weave:[stroke-dashoffset:0] group-focus-within/weave:[stroke-dashoffset:0]';

export function InterlaceWeave({
  'data-testid': testId,
  radius = 12,
  className,
  ...rest
}: InterlaceWeaveProps) {
  const strand = cn(
    // Dash 55, gap 155 → period 210. Rendering at path point s samples
    // pattern position (s + offset) — ground-truthed in the browser, the
    // sign trips everyone — so blank-at-rest requires [offset, offset+100]
    // ⊆ the gap [55, 210): offset ∈ [55, 110]. 55 is the zero-dead-time
    // end: the dash tip sits exactly at the path start, so the draw
    // begins the instant the hover transition does, and offset 0 shows
    // the full 55-unit strand. (Three prior cuts shipped visibly drawn
    // at rest — a modular 100-period pattern, then two sign-flipped
    // parks. Every one read plausibly and failed only in rendering.)
    'fill-none stroke-2 [stroke-dasharray:55_155] [stroke-dashoffset:55]',
    'transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none',
    DRAWN,
  );
  return (
    <svg
      data-slot="interlace-weave"
      data-testid={testId}
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 h-full w-full',
        className,
      )}
      {...rest}
    >
      {/* Strand A — the mark's orange, from the top-left corner. */}
      <rect
        x="1"
        y="1"
        rx={radius}
        pathLength={100}
        className={cn(
          strand,
          'stroke-chart-1',
          '[width:calc(100%_-_2px)] [height:calc(100%_-_2px)]',
        )}
      />
      {/* Strand B — the cool counter, from the bottom-right corner: the
          same rect rotated 180° about the svg center starts its dash at
          the opposite corner, so the tips cross where the strands meet. */}
      <rect
        x="4"
        y="4"
        rx={Math.max(radius - 3, 2)}
        pathLength={100}
        className={cn(
          strand,
          'stroke-chart-2',
          '[width:calc(100%_-_8px)] [height:calc(100%_-_8px)]',
          'origin-center rotate-180',
        )}
      />
    </svg>
  );
}
