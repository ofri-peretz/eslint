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
}

// Next.js extends `fetch` with a `next.revalidate` option for ISR.
// Type widening here keeps the package usable in plain React-server-component
// environments without a hard dependency on Next types.
type NextFetchInit = RequestInit & { next?: { revalidate?: number } };

async function fetchSource(
  url: string,
  revalidate: number,
): Promise<string | null> {
  try {
    const res = await fetch(url, { next: { revalidate } } as NextFetchInit);
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
}: RemoteMarkdownProps) {
  const fetched = await fetchSource(url, revalidate);
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
