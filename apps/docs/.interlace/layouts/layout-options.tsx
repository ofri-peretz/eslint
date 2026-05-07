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
 * Create shared layout options for an Interlace docs site.
 *
 * Produces a `BaseLayoutProps` object consumed by both
 * `HomeLayout` and `DocsLayout` from fumadocs-ui.
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
          {config.logo}
          <span className="font-semibold">{config.title}</span>
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
