/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import type { ReactNode } from 'react';

/**
 * Configuration for an Interlace docs site's shared navigation.
 */
export interface InterlaceLayoutConfig {
  /** Site title — rendered in the nav bar */
  title: string;
  /** Optional logo component (renders before title) */
  logo?: ReactNode;
  /** Navigation links */
  links: Array<{
    text: string;
    url: string;
    active?: 'nested-url' | 'url';
  }>;
  /** GitHub repository URL */
  githubUrl: string;
}

/**
 * The canonical Interlace two-bar mark (viewBox 0 0 100 100, two rx-14 bars
 * rotated -30° about the center). Bar fills read the `--brand-mark-bar-*`
 * tokens from `css/brand.css` — theme-paired AA-safe values keyed to the
 * site's `.dark` class, never raw hex in JSX. `aria-hidden` because the
 * adjacent wordmark/title names the brand.
 */
export function InterlaceMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
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
  );
}

/**
 * Create shared layout options for an Interlace docs site.
 *
 * Produces a `BaseLayoutProps` object consumed by both
 * `HomeLayout` and `DocsLayout` from fumadocs-ui.
 *
 * Nav brand contract: the nav carries the Interlace lockup — the two-bar
 * mark (default logo, override via `config.logo`) plus the site title in
 * the lowercase mono wordmark treatment.
 *
 * @example
 * ```ts
 * import { createBaseOptions } from '@interlace/docs-baseline/layouts/layout-options';
 *
 * export const baseOptions = createBaseOptions({
 *   title: '@interlace/serverless',
 *   links: [{ text: 'Docs', url: '/docs/getting-started', active: 'nested-url' }],
 *   githubUrl: 'https://github.com/ofri-peretz/serverless',
 * });
 * ```
 */
export function createBaseOptions(config: InterlaceLayoutConfig): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          {config.logo ?? <InterlaceMark />}
          <span className="font-mono font-semibold lowercase tracking-tight">
            {config.title}
          </span>
        </>
      ),
      transparentMode: 'top',
    },
    links: config.links.map((link) => ({
      text: link.text,
      url: link.url,
      active: link.active,
    })),
    githubUrl: config.githubUrl,
  };
}
