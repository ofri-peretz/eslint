import * as React from 'react';
import { AnchorProvider, type TableOfContents } from 'fumadocs-core/toc';

import { cn } from '../lib/cn.js';
import {
  RemoteSourceCallout,
  type RemoteSourceCalloutProps,
} from './remote-source-callout.js';

export interface CompiledRemoteContent {
  /** The compiled MDX component (rendered as `<Body />`) */
  Body: React.ComponentType;
  /** TOC for sidebar navigation */
  toc: TableOfContents;
  /** Optional frontmatter */
  frontmatter?: Record<string, unknown>;
}

export interface RemoteMarkdownProps {
  /** URL to fetch markdown/MDX from. */
  url: string;
  /**
   * Consumer-provided MDX compiler. The package stays compiler-agnostic so
   * each app can wire its own remark/rehype plugins, MDX components, link
   * rewrites, etc. (typically `@fumadocs/mdx-remote`'s `createCompiler`).
   */
  compile: (source: string) => Promise<CompiledRemoteContent>;
  /** ISR revalidate window in seconds. Default: 3600 (1 hour). */
  revalidate?: number;
  /** Rendered when fetch fails or the URL returns non-2xx. */
  fallback?: React.ReactNode;
  /** Optional source pre-processor (e.g., section filtering, length limiting). */
  preprocess?: (source: string) => string;
  /** Class on the wrapping element holding the rendered body. */
  className?: string;
  /** Tag for the wrapping element. Default: `article`. */
  as?: keyof React.JSX.IntrinsicElements;
  /**
   * Optional source-callout. Surfaces "where this content came from + how
   * to edit it" on top of the rendered body. Pass `false` to suppress.
   * Pass an object to render `<RemoteSourceCallout>` with those props.
   */
  source?: false | Omit<RemoteSourceCalloutProps, 'className'>;
  /**
   * Cache tags applied to the underlying fetch.
   *
   * Without these the cached entry is untargetable: Vercel's runtime cache
   * outlives a deployment, so shipping a fix to the *remote* document leaves
   * the old copy served until `revalidate` happens to elapse, and nothing can
   * force it sooner. Tagging makes `revalidateTag()` /
   * `vercel cache invalidate --tag` able to reach it, which is what turns a
   * release into a real invalidation instead of a wait.
   */
  tags?: string[];
}

// Next.js extends `fetch` with `next.revalidate` / `next.tags` options.
// Type widening here keeps the package usable in plain React-server-component
// environments without a hard dependency on Next types.
type NextFetchInit = RequestInit & {
  next?: { revalidate?: number; tags?: string[] };
};

async function fetchSource(
  url: string,
  revalidate: number,
  tags: string[] | undefined,
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate, ...(tags?.length ? { tags } : {}) },
    } as NextFetchInit);
    if (!res.ok) {
      console.error(`[RemoteMarkdown] ${url} responded ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (error) {
    console.error(`[RemoteMarkdown] fetch failed for ${url}:`, error);
    return null;
  }
}

/**
 * Server component: fetches markdown from `url`, runs `compile`, and renders
 * the result wrapped in fumadocs' `AnchorProvider` so the TOC sidebar works
 * for dynamically-fetched content.
 *
 * Failed fetches return `fallback` (or `null`).
 */
export async function RemoteMarkdown({
  url,
  compile,
  revalidate = 3600,
  fallback = null,
  preprocess,
  className,
  as: Tag = 'article',
  source,
  tags,
}: RemoteMarkdownProps) {
  const fetched = await fetchSource(url, revalidate, tags);
  if (fetched === null) return <>{fallback}</>;
  const processed = preprocess ? preprocess(fetched) : fetched;
  const { Body, toc } = await compile(processed);
  return (
    <AnchorProvider toc={toc}>
      <Tag className={cn(className)} data-slot="remote-markdown">
        {source ? <RemoteSourceCallout {...source} /> : null}
        <Body />
      </Tag>
    </AnchorProvider>
  );
}
