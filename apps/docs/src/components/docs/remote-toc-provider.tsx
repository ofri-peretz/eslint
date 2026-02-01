'use client';

/**
 * RemoteTocProvider - Client-side TOC provider for remote content
 * 
 * Wraps remote content with Fumadocs' AnchorProvider to enable
 * TOC sidebar navigation for dynamically compiled content.
 */

import { AnchorProvider, type TableOfContents } from 'fumadocs-core/toc';
import { type ReactNode } from 'react';

interface RemoteTocProviderProps {
  /** Table of contents extracted from remote content */
  toc: TableOfContents;
  /** The remote content to render */
  children: ReactNode;
}

export function RemoteTocProvider({ toc, children }: RemoteTocProviderProps) {
  return (
    <AnchorProvider toc={toc}>
      {children}
    </AnchorProvider>
  );
}

export default RemoteTocProvider;
