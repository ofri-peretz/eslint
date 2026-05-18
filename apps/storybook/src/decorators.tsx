import type { Decorator } from '@storybook/react-vite';

/**
 * Shared story decorators that surface the cross-cutting design
 * philosophies in Storybook itself.
 *
 *   - `withRtl`        — wraps a story in `dir="rtl"`. Surfaces baked-in
 *                        left/right asymmetry per `I18N_PHILOSOPHY.md`.
 *   - `withReducedMotion` — injects the same animation-kill CSS used by
 *                        `@media (prefers-reduced-motion: reduce)`
 *                        in `preview.css`, so designers see what a
 *                        reduce user sees per `MOTION_PHILOSOPHY.md`.
 */
export const withRtl: Decorator = (Story) => (
  <div dir="rtl" lang="ar">
    <Story />
  </div>
);

const REDUCED_MOTION_CSS = `
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
`;

export const withReducedMotion: Decorator = (Story) => (
  <>
    <style dangerouslySetInnerHTML={{ __html: REDUCED_MOTION_CSS }} />
    <Story />
  </>
);

export const withDark: Decorator = (Story) => (
  <div className="dark bg-background text-foreground">
    <Story />
  </div>
);
