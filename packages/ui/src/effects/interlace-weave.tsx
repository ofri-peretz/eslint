import * as React from 'react';
import { cn } from '../lib/cn.js';

/**
 * InterlaceWeave — the brand gesture as an interaction signature.
 *
 * ## RFC (R3)
 *
 * Two thin strands — brand orange (`chart-1`) and brand green (`chart-2`),
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
 * Mirrors the house decorative-overlay shape (magicui `BorderBeam`):
 * absolutely positioned, `aria-hidden`, `pointer-events-none` (R23
 * decorative-chrome rule). Radius follows the host via a rect `rx` that
 * matches the DS card radius token scale.
 */
export interface InterlaceWeaveProps
  extends React.ComponentPropsWithoutRef<'svg'> {
  /** Stable selector for E2E tests; consumer provides — no default (R5). */
  'data-testid': string;
  /**
   * Corner radius of the traced border, in viewBox units (the host's
   * rounded-xl ≈ 12).
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
    // dasharray gap (155) exceeds pathLength (100) + dash (55): offset
    // -155 parks the dash entirely outside the visible path (a 100-period
    // pattern would be modular — offset 100 ≡ 0 and the rest state drew
    // fully, caught by the visual pass). Offset 0 draws 55 units.
    'fill-none stroke-2 [stroke-dasharray:55_155] [stroke-dashoffset:-155]',
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
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
      {...rest}
    >
      {/* Strand A — brand orange, from the top-left corner. */}
      <rect
        x="1"
        y="1"
        width="98"
        height="98"
        rx={radius}
        pathLength={100}
        vectorEffect="non-scaling-stroke"
        className={cn(strand, 'stroke-chart-1')}
      />
      {/* Strand B — brand green, from the bottom-right corner: the same
          rect rotated 180° around the center starts its dash at the
          opposite corner, so the tips cross where the strands meet. */}
      <rect
        x="4"
        y="4"
        width="92"
        height="92"
        rx={Math.max(radius - 3, 2)}
        pathLength={100}
        vectorEffect="non-scaling-stroke"
        transform="rotate(180 50 50)"
        className={cn(strand, 'stroke-chart-2')}
      />
    </svg>
  );
}
