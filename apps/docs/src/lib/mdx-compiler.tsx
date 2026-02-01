/**
 * MDX Remote Compiler
 *
 * Compiles remote Markdown/MDX content using @fumadocs/mdx-remote.
 * Uses the createCompiler() API for efficient compilation.
 * 
 * Features:
 * - Relative link resolution for inter-document linking
 * - Full MDX component support
 * - Table of contents extraction
 */

import { createCompiler } from '@fumadocs/mdx-remote';
import { getMDXComponents } from '@/mdx-components';
import type { TableOfContents } from 'fumadocs-core/toc';
import { visit } from 'unist-util-visit';
import type { Root, Link } from 'mdast';

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
 * Compilation options for remote content
 */
export interface CompileOptions {
  /** Base URL for resolving relative links (e.g., '/docs/security/browser-security') */
  baseUrl?: string;
  /** Plugin name for plugin rule docs (e.g., 'browser-security') */
  pluginName?: string;
}

/**
 * Creates a remark plugin to transform relative markdown links
 * to app routes.
 * 
 * Examples:
 * - `./no-eval.md` → `/docs/security/browser-security/no-eval`
 * - `../jwt/no-none-algorithm.md` → `/docs/security/jwt/no-none-algorithm`
 * - `#section` → preserved as-is (anchor links)
 * - `https://example.com` → preserved as-is (external links)
 */
function remarkRelativeLinks(options: CompileOptions) {
  const { baseUrl, pluginName } = options;
  
  return () => (tree: Root) => {
    visit(tree, 'link', (node: Link) => {
      const url = node.url;
      
      // Skip external links, anchors, and absolute paths
      if (
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('#') ||
        url.startsWith('/')
      ) {
        return;
      }
      
      // Handle relative markdown links
      if (url.endsWith('.md') || url.endsWith('.mdx')) {
        // Remove the extension
        let resolvedUrl = url.replace(/\.mdx?$/, '');
        
        // Handle same-directory links: ./no-eval.md
        if (resolvedUrl.startsWith('./')) {
          resolvedUrl = resolvedUrl.slice(2);
          if (baseUrl) {
            node.url = `${baseUrl}/${resolvedUrl}`;
          } else if (pluginName) {
            // Default to security pillar for plugin rules
            node.url = `/docs/security/${pluginName}/${resolvedUrl}`;
          }
        }
        // Handle parent-directory links: ../jwt/rule.md
        else if (resolvedUrl.startsWith('../')) {
          // Navigate up and resolve
          const parts = resolvedUrl.split('/').filter(p => p && p !== '..');
          if (parts.length >= 2) {
            // Assume format: ../[plugin]/[rule]
            const [targetPlugin, ...rest] = parts;
            node.url = `/docs/security/${targetPlugin}/${rest.join('/')}`;
          }
        }
        // Handle bare relative links: no-eval.md
        else {
          if (baseUrl) {
            node.url = `${baseUrl}/${resolvedUrl}`;
          } else if (pluginName) {
            node.url = `/docs/security/${pluginName}/${resolvedUrl}`;
          }
        }
      }
    });
  };
}

/**
 * Compile remote MDX content with link resolution
 */
export async function compileRemoteMDX(
  source: string,
  options: CompileOptions = {}
): Promise<CompiledContent> {
  const remarkPlugins = [];
  
  // Add relative link transformer if we have context
  if (options.baseUrl || options.pluginName) {
    remarkPlugins.push(remarkRelativeLinks(options));
  }
  
  const result = await compiler.compile({
    source,
    components: getMDXComponents(),
    // @ts-expect-error - remarkPlugins type mismatch with mdx-remote
    remarkPlugins,
  });

  return {
    Body: result.body,
    toc: result.toc,
    frontmatter: result.frontmatter as CompiledContent['frontmatter'],
  };
}

/**
 * Compile remote Markdown (non-MDX) content with link resolution
 */
export async function compileRemoteMarkdown(
  source: string,
  options: CompileOptions = {}
): Promise<CompiledContent> {
  const remarkPlugins = [];
  
  // Add relative link transformer if we have context
  if (options.baseUrl || options.pluginName) {
    remarkPlugins.push(remarkRelativeLinks(options));
  }
  
  const result = await compiler.compile({
    source,
    components: getMDXComponents(),
    // @ts-expect-error - remarkPlugins type mismatch with mdx-remote
    remarkPlugins,
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
