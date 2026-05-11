/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * Per-page OG image generator.
 *
 * Wraps Fumadocs's `generate` OG component into a route-handler-friendly
 * factory. Each docs page gets a unique OG image with its title + description
 * + the consumer's site name.
 *
 * The Next.js convention `app/opengraph-image.tsx` (a single static OG for
 * the whole site) is consumer-owned and per-product — keep it bespoke. This
 * helper is for the per-page case.
 *
 * @example consumer route at `app/og/docs/[...slug]/route.tsx`
 * ```tsx
 * import { source } from '#interlace/lib/source';
 * import { createDocsOGRoute } from '#interlace/lib/og-image';
 *
 * export const { GET, generateStaticParams } = createDocsOGRoute({
 *   source,
 *   site: '@interlace/serverless',
 * });
 *
 * export const revalidate = false;
 * ```
 */

import { ImageResponse } from 'next/og';
import { generate as DefaultOGImage } from 'fumadocs-ui/og';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import { source as defaultSource, getPageImage } from './source';

export interface DocsOGRouteOptions {
  /** The Fumadocs source (defaults to baseline `source`) */
  source?: typeof defaultSource;
  /** Site name shown in the OG card footer (e.g. "@interlace/serverless") */
  site: string;
  /** OG image width — default 1200 */
  width?: number;
  /** OG image height — default 630 */
  height?: number;
  /** Render override — bypass Fumadocs default and use a custom React tree */
  render?: (page: {
    title: string;
    description?: string;
  }) => ReactElement;
}

/**
 * Build a `{ GET, generateStaticParams }` pair for a Next.js route handler.
 *
 * Mounts on `app/og/docs/[...slug]/route.tsx`. Generates a per-docs-page
 * OG image driven by the page's title + description.
 */
export function createDocsOGRoute(options: DocsOGRouteOptions) {
  const src = options.source ?? defaultSource;
  const width = options.width ?? 1200;
  const height = options.height ?? 630;

  async function GET(
    _req: Request,
    { params }: { params: Promise<{ slug: string[] }> },
  ): Promise<Response> {
    const { slug } = await params;
    // The convention is `og/docs/<...page-slug>/image.png` — drop the trailing
    // `image.png` to look up the actual page.
    const pageSlug = slug.slice(0, -1);
    const page = src.getPage(pageSlug);
    if (!page) notFound();

    const tree = options.render
      ? options.render({
          title: page.data.title,
          description: page.data.description,
        })
      : (
          <DefaultOGImage
            title={page.data.title}
            description={page.data.description}
            site={options.site}
          />
        );

    return new ImageResponse(tree, { width, height });
  }

  function generateStaticParams() {
    return src.getPages().map((page) => ({
      slug: getPageImage(page).segments,
    }));
  }

  return { GET, generateStaticParams };
}
