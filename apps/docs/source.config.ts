import {
  defineConfig,
  defineDocs,
  frontmatterSchema,
  metaSchema,
} from 'fumadocs-mdx/config';
import { transformerTwoslash } from 'fumadocs-twoslash';
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins';
import { CODE_HIGHLIGHT_OPTIONS } from './src/lib/code-highlight';
import { remarkInstallTabs } from './.interlace/config/remark-install-tabs.mjs';
import { rehypeTableStack } from './.interlace/config/rehype-table-stack.mjs';

// You can customise Zod schemas for frontmatter and `meta.json` here
// see https://fumadocs.dev/docs/mdx/collections
export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: frontmatterSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    // `npm install` fences become npm/pnpm/yarn/bun tabs; tables fold into cards on a
    // narrow column (styles in `.interlace/css/table-stack.css`). Both from the docs
    // baseline; locked by `src/__tests__/doc-components-lock.test.ts`.
    remarkPlugins: [remarkInstallTabs],
    rehypePlugins: [rehypeTableStack],
    // Never fetch external images at build time just to measure them — one
    // flaky third-party host (shields.io 502'd on PR #286) would otherwise
    // fail the whole prerender. External images render unsized through the
    // `img` override in `src/mdx-components.tsx`.
    // Locked by `src/__tests__/remote-image-offline-lock.test.tsx`.
    remarkImageOptions: { external: false },
    // Twoslash - TypeScript inline hints in code blocks
    // Use ```ts twoslash or ```tsx twoslash to enable
    // Note: ```mermaid fences are dispatched to <Mermaid> via a `pre`
    // override in `src/mdx-components.tsx` — AST-level remark transforms
    // didn't survive fumadocs-mdx's recma stage cleanly.
    rehypeCodeOptions: {
      // Themes and the AA colour fixes are shared with every other
      // highlighter on the site — see `src/lib/code-highlight.ts`.
      ...CODE_HIGHLIGHT_OPTIONS,
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerTwoslash(),
      ],
      // Required: Shiki doesn't support lazy loading for Twoslash
      langs: [
        'js',
        'jsx',
        'ts',
        'tsx',
        'json',
        'bash',
        'sh',
        'yaml',
        'md',
        'mdx',
      ],
    },
  },
});
