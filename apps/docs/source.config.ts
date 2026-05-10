import { defineConfig, defineDocs, frontmatterSchema, metaSchema } from 'fumadocs-mdx/config';
import { transformerTwoslash } from 'fumadocs-twoslash';
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins';

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
    // Twoslash - TypeScript inline hints in code blocks
    // Use ```ts twoslash or ```tsx twoslash to enable
    rehypeCodeOptions: {
      // `github-light-default` / `github-dark-default` are the higher-
      // contrast GitHub syntax themes that meet WCAG 2 AAA (7:1) on the
      // matching code-block background. The older `github-light` /
      // `github-dark` only meet AA — failed @axe-core color-contrast.
      themes: {
        light: 'github-light-default',
        dark: 'github-dark-default',
      },
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerTwoslash(),
      ],
      // Required: Shiki doesn't support lazy loading for Twoslash
      langs: ['js', 'jsx', 'ts', 'tsx', 'json', 'bash', 'sh', 'yaml', 'md', 'mdx'],
    },
  },
});
