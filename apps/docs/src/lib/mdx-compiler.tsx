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
import type { PluggableList } from 'unified';

// The compiler is instantiated per-request so remarkPlugins can be provided in mdxOptions

/**
 * `remarkImage` fetches every external image at build time just to read its
 * intrinsic size. The plugin READMEs we render carry ~275 shields.io badges,
 * so a single shields.io hiccup failed the whole prerender — that's exactly
 * how PR #286 went red:
 *
 *   [Remark Image] Failed obtain image size for
 *   https://img.shields.io/npm/dt/@nestjs/core.svg (502)
 *
 * (fumadocs soft-fails `.svg` URLs, but badge URLs carry `?style=flat-square`,
 * so the `.svg` suffix check never matched.)
 *
 * `external: false` drops the fetch entirely: external images render through
 * the `img` override in `src/mdx-components.tsx`, which reserves layout space
 * without knowing the intrinsic size. Locked by
 * `src/__tests__/remote-image-offline-lock.test.tsx`.
 *
 * ponytail: the override reserves a nominal box (20px tall for badge hosts)
 * rather than the exact intrinsic size. If a README ever needs pixel-exact
 * reservation, cache the dimensions alongside the content — do not put the
 * build back on the network.
 */
const REMARK_IMAGE_OPTIONS = { external: false } as const;

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
  
  // Map of external repos to rewrite to our monorepo. Anchored with `^` so a
  // crafted URL like `https://evil.com/?next=https://github.com/import-js/...`
  // can never match — CodeQL flagged the unanchored form as
  // "Missing regular expression anchor".
  const rewritePatterns: [RegExp, string][] = [
    // eslint-plugin-import → our import-next package
    [
      /^https?:\/\/github\.com\/import-js\/eslint-plugin-import\/(blob|tree)\/main\/(.+)$/,
      'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/$2'
    ],
    [
      /^https?:\/\/github\.com\/import-js\/eslint-plugin-import\/?$/,
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

// The ```mermaid → `<Mermaid />` JSX transform is shared with the static-MDX
// pipeline (apps/docs/source.config.ts) — it lives at ./remark-mermaid.ts and
// emits the chart as an MDX expression value so multi-line + `%%{init}%%`
// directives survive compilation.

/**
 * Compile remote MDX content with link resolution
 */
export async function compileRemoteMDX(
  source: string,
  options: CompileOptions = {}
): Promise<CompiledContent> {
  // Strip HTML comments BEFORE MDX parsing. The plugin READMEs use
  // `<!-- AUTO-GENERATED:RULES_TABLE:START -->` etc. as splice markers for
  // scripts/sync-readme-rules.ts. These are valid GFM (and render invisibly
  // on GitHub) but MDX 3 / Next.js 16 Turbopack reject them with
  // "Unexpected character `!` (U+0021) before name" — the `<` triggers JSX
  // parsing, which expects an identifier, not `!`.
  // We strip them here so the rest of the toolchain stays untouched.
  // Loop until stable: a single pass can leave a fresh `<!--` behind when
  // markers overlap (e.g. `<!--<!-- -->-->`), which CodeQL flags as
  // js/incomplete-multi-character-sanitization. Re-running until no match
  // remains makes the strip idempotent regardless of nesting.
  let stripped = source;
  let prev: string;
  do {
    prev = stripped;
    stripped = stripped.replace(/<!--[\s\S]*?-->/g, '');
  } while (stripped !== prev);

  // ```mermaid blocks are dispatched on the React side by the `pre`
  // override in `src/mdx-components.tsx` — no remark transform needed.
  const processedSource = stripped;

  const remarkPlugins: PluggableList = [];
  
  // Add relative link transformer if we have context
  if (options.baseUrl || options.pluginName) {
    remarkPlugins.push(remarkRelativeLinks(options));
  }
  
  // Create compiler instance with our dynamic remark plugins
  // `format: 'md'` — see the note on compileRemoteMarkdown below. This path
  // renders CHANGELOG.md fetched from GitHub at build time, and a CHANGELOG is
  // CommonMark assembled from arbitrary changeset prose. Compiling it as MDX
  // makes every `{...}` in someone's release note a JSX expression to evaluate.
  const localCompiler = createCompiler({
    format: 'md',
    remarkPlugins,
    remarkImageOptions: REMARK_IMAGE_OPTIONS,
  });

  const result = await localCompiler.compile({
    source: processedSource,
    components: getMDXComponents(),
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
  // ```mermaid blocks are dispatched on the React side by the `pre`
  // override in `src/mdx-components.tsx` — no remark transform needed.
  const processedSource = source;

  const remarkPlugins: PluggableList = [];
  
  // Add relative link transformer if we have context
  if (options.baseUrl || options.pluginName) {
    remarkPlugins.push(remarkRelativeLinks(options));
  }
  
  // Create compiler instance with our dynamic remark plugins.
  //
  // `format: 'md'` — this path renders CHANGELOG.md and README.md fetched from
  // GitHub, and those are CommonMark, not MDX. Compiling them as MDX makes
  // every `{...}` in someone's release note a JSX expression to evaluate.
  //
  // That is not hypothetical. A changeset merged on 2026-08-23 contained
  //
  //     `body: \`client_id=${id}&...\``
  //
  // and markdown does not honour backslash escapes inside a code span, so the
  // inner backtick closed it early and `{id}` fell outside. The docs build died
  // with `ReferenceError: id is not defined` on three plugins' changelog pages.
  //
  // The build FETCHES this content from `main` at build time, so the break
  // arrived with no code change and could not be fixed by editing the file
  // locally — the pre-push hook runs this same build, which re-fetches the
  // broken text. Parsing as markdown removes the whole class.
  const localCompiler = createCompiler({
    format: 'md',
    remarkPlugins,
    remarkImageOptions: REMARK_IMAGE_OPTIONS,
  });

  const result = await localCompiler.compile({
    source: processedSource,
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
