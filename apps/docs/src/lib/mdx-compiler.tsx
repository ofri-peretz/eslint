/**
 * MDX Remote Compiler
 *
 * Compiles remote Markdown/MDX content using @fumadocs/mdx-remote.
 * Uses the createCompiler() API for efficient compilation.
 */

import { createCompiler, type CompileMDXResult } from '@fumadocs/mdx-remote';
import { getMDXComponents } from '@/mdx-components';
import type { TableOfContents } from 'fumadocs-core/toc';

// Create a reusable compiler instance
const compiler = createCompiler();

export interface CompiledContent {
  /** The compiled MDX component (render as <Body />) */
  Body: React.ComponentType;
  toc: TableOfContents;
  frontmatter: {
    title?: string;
    description?: string;
    [key: string]: unknown;
  };
}

/**
 * Compile remote MDX content
 */
export async function compileRemoteMDX(
  source: string
): Promise<CompiledContent> {
  const result = await compiler.compile({
    source,
    components: getMDXComponents(),
  });

  return {
    Body: result.body,
    toc: result.toc,
    frontmatter: result.frontmatter as CompiledContent['frontmatter'],
  };
}

/**
 * Compile remote Markdown (non-MDX) content
 * Strips JSX and compiles as plain markdown
 */
export async function compileRemoteMarkdown(
  source: string
): Promise<CompiledContent> {
  const result = await compiler.compile({
    source,
    components: getMDXComponents(),
  });

  return {
    Body: result.body,
    toc: result.toc,
    frontmatter: result.frontmatter as CompiledContent['frontmatter'],
  };
}

/**
 * Generate fallback content when remote fetch fails
 */
export function getFallbackContent(
  title: string,
  description: string
): CompiledContent {
  const FallbackBody = () => (
    <div className="prose dark:prose-invert">
      <p className="text-fd-muted-foreground">
        This content is currently being fetched from GitHub. If it
        doesn&apos;t load, please check back later or view the source
        repository directly.
      </p>
    </div>
  );

  return {
    Body: FallbackBody,
    toc: [],
    frontmatter: {
      title,
      description,
    },
  };
}
