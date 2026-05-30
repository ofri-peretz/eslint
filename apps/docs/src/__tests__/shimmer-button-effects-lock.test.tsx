// @vitest-environment jsdom
/**
 * ShimmerButton effects lock
 *
 * Locks the contract of the two decorative props on @interlace/ui's
 * ShimmerButton — `shimmer` (rotating spark animation) and `highlight`
 * (inset white bottom-edge glow). The two are INDEPENDENT and can be
 * toggled separately:
 *
 *   - Both default `true`. Animated primary CTA = no props needed.
 *   - `shimmer={false}` → drops the rotating spark; keeps the highlight if
 *     `highlight` is still `true`.
 *   - `highlight={false}` → drops the white inset; keeps the spark if
 *     `shimmer` is still `true`.
 *   - `shimmer={false} highlight={false}` → clean ShimmerButton-shaped pill
 *     with neither effect — used for the hero secondary so it shares the
 *     primary's pill geometry but carries no decoration that would compete
 *     with it.
 *
 * Why this lock matters
 * ---------------------
 * Coupling the two props (the prior implementation gated the highlight on
 * `shimmer`) made it impossible to ship "spark on, highlight off" or
 * "spark off, highlight on" without an override stack. Splitting them
 * lets each effect carry its own intent. The lock guards against a future
 * regression that re-couples them or drops a gate entirely.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ShimmerButton } from '@interlace/ui/magicui/shimmer-button';

// Class fragments unique to each decorative layer in the magicui source.
// If the upstream class strings change, these constants are the single
// place to update — keeping the test resilient to incidental refactors
// while still pinning the behavioral contract.
const SPARK_CLASS = 'animate-shimmer-slide';
const HIGHLIGHT_SHADOW = 'shadow-[inset_0_-8px_10px_#ffffff1f]';

// Pill geometry that BOTH variants must keep — sibling parity.
const PILL_PADDING_X = 'px-6';
const PILL_PADDING_Y = 'py-3';
const PILL_RADIUS = '[border-radius:var(--radius)]';

describe('ShimmerButton — `shimmer` and `highlight` are independent', () => {
  describe('defaults (no props passed)', () => {
    it('mounts the rotating spark animation', () => {
      const { container } = render(
        <ShimmerButton>Get Started</ShimmerButton>,
      );
      expect(container.querySelector(`.${SPARK_CLASS}`)).not.toBeNull();
    });

    it('mounts the inset white highlight at the bottom edge', () => {
      const { container } = render(
        <ShimmerButton>Get Started</ShimmerButton>,
      );
      // The highlight div carries the inset white shadow class; querying the
      // raw HTML keeps the check independent of how Tailwind escapes the
      // bracketed arbitrary-value class in CSS selectors.
      expect(container.innerHTML).toContain(HIGHLIGHT_SHADOW);
    });
  });

  describe('shimmer={false} (spark off — highlight is independent)', () => {
    it('does NOT mount the rotating spark animation', () => {
      const { container } = render(
        <ShimmerButton shimmer={false}>x</ShimmerButton>,
      );
      expect(container.querySelector(`.${SPARK_CLASS}`)).toBeNull();
      expect(container.querySelector('.animate-spin-around')).toBeNull();
    });

    it('STILL mounts the inset white highlight (independent of `shimmer`)', () => {
      const { container } = render(
        <ShimmerButton shimmer={false}>x</ShimmerButton>,
      );
      expect(container.innerHTML).toContain(HIGHLIGHT_SHADOW);
    });
  });

  describe('highlight={false} (white inset off — spark is independent)', () => {
    it('does NOT mount the inset white highlight', () => {
      const { container } = render(
        <ShimmerButton highlight={false}>x</ShimmerButton>,
      );
      expect(container.innerHTML).not.toContain(HIGHLIGHT_SHADOW);
    });

    it('STILL mounts the rotating spark animation (independent of `highlight`)', () => {
      const { container } = render(
        <ShimmerButton highlight={false}>x</ShimmerButton>,
      );
      expect(container.querySelector(`.${SPARK_CLASS}`)).not.toBeNull();
    });
  });

  describe('shimmer={false} highlight={false} (hero secondary pattern)', () => {
    it('mounts NEITHER decorative effect', () => {
      const { container } = render(
        <ShimmerButton shimmer={false} highlight={false}>
          GitHub
        </ShimmerButton>,
      );
      expect(container.querySelector(`.${SPARK_CLASS}`)).toBeNull();
      expect(container.querySelector('.animate-spin-around')).toBeNull();
      expect(container.innerHTML).not.toContain(HIGHLIGHT_SHADOW);
    });
  });

  describe('Sibling parity — geometry survives `shimmer={false}`', () => {
    it('keeps px-6 py-3 padding regardless of `shimmer`', () => {
      const animated = render(
        <ShimmerButton>Get Started</ShimmerButton>,
      );
      const staticBtn = render(
        <ShimmerButton shimmer={false}>GitHub</ShimmerButton>,
      );
      expect(animated.container.innerHTML).toContain(PILL_PADDING_X);
      expect(animated.container.innerHTML).toContain(PILL_PADDING_Y);
      expect(staticBtn.container.innerHTML).toContain(PILL_PADDING_X);
      expect(staticBtn.container.innerHTML).toContain(PILL_PADDING_Y);
    });

    it('keeps the pill border-radius variable regardless of `shimmer`', () => {
      const animated = render(
        <ShimmerButton>Get Started</ShimmerButton>,
      );
      const staticBtn = render(
        <ShimmerButton shimmer={false}>GitHub</ShimmerButton>,
      );
      expect(animated.container.innerHTML).toContain(PILL_RADIUS);
      expect(staticBtn.container.innerHTML).toContain(PILL_RADIUS);
    });

    it('renders children identically for both variants', () => {
      // Scope the text check to each container — `getByText` searches the
      // whole document by default and would clash because both renders
      // mount into the same jsdom body.
      const animated = render(
        <ShimmerButton>Same Label</ShimmerButton>,
      );
      const staticBtn = render(
        <ShimmerButton shimmer={false}>Same Label</ShimmerButton>,
      );
      expect(animated.container.textContent).toContain('Same Label');
      expect(staticBtn.container.textContent).toContain('Same Label');
    });
  });

  describe('Background prop applies in both modes', () => {
    it('applies the `background` CSS variable when shimmer is on', () => {
      const { container } = render(
        <ShimmerButton background="linear-gradient(to right, red, blue)">
          x
        </ShimmerButton>,
      );
      // The component sets `--bg` on the root element's inline style.
      const root = container.firstElementChild as HTMLElement | null;
      expect(root?.style.getPropertyValue('--bg')).toBe(
        'linear-gradient(to right, red, blue)',
      );
    });

    it('applies the `background` CSS variable when shimmer is off', () => {
      const { container } = render(
        <ShimmerButton shimmer={false} background="rgba(15, 23, 42, 0.6)">
          x
        </ShimmerButton>,
      );
      const root = container.firstElementChild as HTMLElement | null;
      expect(root?.style.getPropertyValue('--bg')).toBe(
        'rgba(15, 23, 42, 0.6)',
      );
    });
  });
});
