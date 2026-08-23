import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

/**
 * Shared layout options for ESLint Interlace documentation
 * Used by both docs and homepage layouts.
 *
 * Brand contract (nav slot):
 * - The nav carries the Interlace identity only: the two-bar mark +
 *   lowercase monospace wordmark "interlace". The ESLint hexagon lives in
 *   the homepage hero (see `components/home/hero-section.tsx`), NOT here —
 *   the old co-branded `eslint-interlace-logo*.svg` lockups stay in
 *   `public/` because the npm READMEs hot-link them.
 * - Mark geometry is the canonical Interlace mark (viewBox 0 0 100 100,
 *   two rx-14 bars rotated -30° about the center). Bar fills read the
 *   `--brand-mark-bar-*` tokens from `global.css` — theme-paired AA-safe
 *   values keyed to the site's `.dark` class (fumadocs theme), not
 *   `prefers-color-scheme`.
 * - Wordmark is ALWAYS lowercase "interlace" in the site's mono stack.
 *
 * a11y notes:
 * - Mark `<svg>` is `aria-hidden` because the adjacent `<span>` already
 *   names the brand (same reasoning as the previous `alt=""` logo image).
 * - We deliberately do NOT use `githubUrl` from BaseLayoutProps — fumadocs
 *   renders that as an inline `<svg role="img">` without `<title>` /
 *   `aria-label`, tripping axe `svg-img-alt`. We instead push our own GitHub
 *   link as an `icon` link item with an `aria-hidden` SVG (link itself has
 *   the accessible name via `label`).
 */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <svg
            viewBox="0 0 100 100"
            width={22}
            height={22}
            aria-hidden="true"
            className="shrink-0"
          >
            <g transform="rotate(-30 50 50)">
              <rect
                x="10"
                y="18"
                width="62"
                height="28"
                rx="14"
                fill="var(--brand-mark-bar-o)"
              />
              <rect
                x="28"
                y="54"
                width="62"
                height="28"
                rx="14"
                fill="var(--brand-mark-bar-g)"
              />
            </g>
          </svg>
          <span className="font-mono font-semibold lowercase tracking-tight">
            interlace
          </span>
        </>
      ),
      transparentMode: 'top',
    },
    links: [
      {
        text: 'Documentation',
        url: '/docs',
        active: 'nested-url',
      },
      {
        text: 'Plugins',
        url: '/plugins',
        active: 'nested-url',
      },
      {
        text: 'Playground',
        url: '/play',
        active: 'nested-url',
      },
      {
        text: 'Learn',
        url: '/docs/learn',
        active: 'nested-url',
      },
      {
        text: 'Scorecard',
        url: '/scorecard',
      },
      {
        text: 'Stats',
        url: '/stats',
      },
      {
        text: 'Articles',
        url: '/articles',
      },
      {
        type: 'icon',
        url: 'https://github.com/ofri-peretz/eslint',
        text: 'GitHub',
        label: 'GitHub',
        external: true,
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
        ),
      },
    ],
  };
}
