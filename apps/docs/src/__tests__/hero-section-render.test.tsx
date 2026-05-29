/**
 * Hero section render-time lock
 *
 * The source-text asserts in `homepage-lock.test.tsx` survive comment
 * drift but can't catch refactors that route the JSX through a render
 * path where the button doesn't reach the DOM (e.g. HeroCosmic accidentally
 * dropping `secondaryCta.label`, or a wrapper that swallows children).
 * This test mounts the real `<HeroSection />` and pins the rendered
 * outcome via the data-* seams added to ShimmerButton:
 *
 *   - `data-slot="shimmer-button"` on every ShimmerButton.
 *   - `data-shimmer-spark` on the rotating spark layer (present only when
 *     `shimmer` is truthy).
 *   - `data-shimmer-highlight` on the inset white glow (present only when
 *     `highlight` is truthy).
 *
 * The contract:
 *   - Hero renders EXACTLY two ShimmerButtons.
 *   - PRIMARY (accessible name "Get Started") carries BOTH effect layers.
 *   - SECONDARY (accessible name "GitHub") carries NEITHER effect layer.
 *
 * If this test fails, the hero CTA shape has regressed. Fix the code,
 * not the test — see `CTA_PHILOSOPHY.md` §#3 (sibling parity) and §#8
 * (animation budget reserved for the primary).
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// The cosmic background uses <canvas> + IntersectionObserver — neither is
// reliable in jsdom and we don't care about them here. Stub the aceternity
// modules to no-op components so we only render the hero's structural shell.
vi.mock('@interlace/ui/aceternity/stars-background', () => ({
  StarsBackground: () => null,
  ShootingStars: () => null,
  Meteors: () => null,
}));

import { HeroSection } from '@/components/home/hero-section';

describe('HeroSection — DOM render lock', () => {
  it('renders exactly two ShimmerButton instances', () => {
    const { container } = render(<HeroSection />);
    const buttons = container.querySelectorAll('[data-slot="shimmer-button"]');
    expect(buttons.length).toBe(2);
  });

  it('PRIMARY ShimmerButton ("Get Started") carries BOTH spark and highlight layers', () => {
    const { container, getByText } = render(<HeroSection />);
    const label = getByText(/Get Started/i);
    const button = label.closest('[data-slot="shimmer-button"]');
    expect(button, 'primary CTA must be a ShimmerButton').not.toBeNull();
    expect(button!.querySelector('[data-shimmer-spark]')).not.toBeNull();
    expect(button!.querySelector('[data-shimmer-highlight]')).not.toBeNull();
    expect(button!.getAttribute('data-shimmer')).toBe('');
    expect(button!.getAttribute('data-highlight')).toBe('');
    // Geometry parity — pill padding stays put.
    expect(button!.className).toMatch(/\bpx-6\b/);
    expect(button!.className).toMatch(/\bpy-3\b/);
    // Sanity — silence unused-var lint
    expect(container).toBeTruthy();
  });

  it('SECONDARY ShimmerButton ("Star on GitHub") carries NEITHER spark nor highlight (CTA_PHILOSOPHY #8)', () => {
    const { container, getByText } = render(<HeroSection />);
    const label = getByText(/Star on GitHub/);
    const button = label.closest('[data-slot="shimmer-button"]');
    expect(button, 'secondary CTA must be a ShimmerButton').not.toBeNull();
    expect(
      button!.querySelector('[data-shimmer-spark]'),
      'secondary must not render the rotating spark',
    ).toBeNull();
    expect(
      button!.querySelector('[data-shimmer-highlight]'),
      'secondary must not render the white inset highlight',
    ).toBeNull();
    expect(button!.getAttribute('data-shimmer')).toBeNull();
    expect(button!.getAttribute('data-highlight')).toBeNull();
    // Geometry parity — pill padding stays put.
    expect(button!.className).toMatch(/\bpx-6\b/);
    expect(button!.className).toMatch(/\bpy-3\b/);
    expect(container).toBeTruthy();
  });

  it('the two ShimmerButtons share pill geometry (sibling parity — CTA_PHILOSOPHY #3)', () => {
    const { container } = render(<HeroSection />);
    const buttons = container.querySelectorAll('[data-slot="shimmer-button"]');
    expect(buttons.length).toBe(2);
    for (const btn of Array.from(buttons)) {
      expect(btn.className).toMatch(/\bpx-6\b/);
      expect(btn.className).toMatch(/\bpy-3\b/);
    }
  });
});
