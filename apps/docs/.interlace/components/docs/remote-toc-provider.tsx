/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
'use client';

/**
 * Wraps remote-fetched content with Fumadocs's AnchorProvider so a docs page
 * can show a TOC sidebar driven by headings extracted from the remote markdown.
 *
 * The consumer's MDX compilation step produces a `TableOfContents` value;
 * this component is a thin pass-through to `AnchorProvider` to keep the
 * client-side wiring out of the consumer's component code.
 */

import { AnchorProvider, type TableOfContents } from 'fumadocs-core/toc';
import { type ReactNode } from 'react';

export interface RemoteTocProviderProps {
  toc: TableOfContents;
  children: ReactNode;
}

export function RemoteTocProvider({ toc, children }: RemoteTocProviderProps) {
  return <AnchorProvider toc={toc}>{children}</AnchorProvider>;
}
