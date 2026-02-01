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
 * to app routes, and rewrite external links to point to our repository.
 * 
 * Examples:
 * - `./no-eval.md` → `/docs/security/browser-security/no-eval`
 * - `../jwt/no-none-algorithm.md` → `/docs/security/jwt/no-none-algorithm`
 * - `#section` → preserved as-is (anchor links)
 * - `https://github.com/import-js/eslint-plugin-import/...` → rewritten to our repo
 */
function remarkRelativeLinks(options: CompileOptions) {
  const { baseUrl, pluginName } = options;
  
  // Map of external repos to rewrite to our monorepo
  const rewritePatterns: [RegExp, string][] = [
    // eslint-plugin-import → our import-next package
    [
      /https?:\/\/github\.com\/import-js\/eslint-plugin-import\/(blob|tree)\/main\/(.+)/,
      'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/$2'
    ],
    [
      /https?:\/\/github\.com\/import-js\/eslint-plugin-import\/?$/,
      'https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-import-next'
    ],
  ];
  
  return () => (tree: Root) => {
    visit(tree, 'link', (node: Link) => {
      const url = node.url;
      
      // Rewrite external links to our repository
      for (const [pattern, replacement] of rewritePatterns) {
        if (pattern.test(url)) {
          node.url = url.replace(pattern, replacement);
          return; // Don't process further
        }
      }
      
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
 * Pre-process markdown source to transform mermaid code blocks
 * into Mermaid component calls before MDX compilation.
 * 
 * Transforms:
 * ```mermaid
 * graph TD; A-->B;
 * ```
 * 
 * Into:
 * <Mermaid chart="graph TD; A-->B;" />
 */
function transformMermaidBlocks(source: string): string {
  // Match mermaid code blocks with the full content
  const mermaidBlockRegex = /```mermaid\n([\s\S]*?)```/g;
  
  return source.replace(mermaidBlockRegex, (match, chart) => {
    // Escape for JSX attribute: double quotes, backslashes, and newlines
    const escapedChart = chart
      .trim()
      .replace(/\\/g, '\\\\')     // Escape backslashes first
      .replace(/"/g, '\\"')      // Escape double quotes
      .replace(/\n/g, '\\n');    // Convert newlines to \n strings
    return `<Mermaid chart="${escapedChart}" />`;
  });
}

/**
 * Creates a remark plugin to transform mermaid code blocks
 * into Mermaid component calls (fallback for non-preprocessed content).
 */
function remarkMermaid() {
  return () => (tree: Root) => {
    visit(tree, 'code', (node: any, index: number, parent: any) => {
      if (node.lang === 'mermaid' && parent && typeof index === 'number') {
        // Transform to MDX JSX element
        const chart = node.value.replace(/"/g, '\\"').replace(/\n/g, '\\n');
        parent.children[index] = {
          type: 'mdxJsxFlowElement',
          name: 'Mermaid',
          attributes: [
            {
              type: 'mdxJsxAttribute',
              name: 'chart',
              value: chart,
            },
          ],
          children: [],
        };
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
  // Pre-process mermaid blocks before MDX compilation
  const processedSource = transformMermaidBlocks(source);
  
  const remarkPlugins: any[] = [];
  
  // Add relative link transformer if we have context
  if (options.baseUrl || options.pluginName) {
    remarkPlugins.push(remarkRelativeLinks(options));
  }
  
  const result = await compiler.compile({
    source: processedSource,
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
  // Pre-process mermaid blocks before MDX compilation
  const processedSource = transformMermaidBlocks(source);
  
  const remarkPlugins: any[] = [];
  
  // Add relative link transformer if we have context
  if (options.baseUrl || options.pluginName) {
    remarkPlugins.push(remarkRelativeLinks(options));
  }
  
  const result = await compiler.compile({
    source: processedSource,
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
