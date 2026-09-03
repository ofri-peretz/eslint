/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * @interlace/docs-baseline — Fumadocs MDX source config
 *
 * Standard source.config.ts baseline with twoslash support
 * and consistent code highlighting themes.
 *
 * Each consuming app re-exports this or extends it.
 *
 * @example
 * ```ts
 * // source.config.ts (in consuming app)
 * export { docs, default } from '@interlace/docs-baseline/config/source.config.base';
 * ```
 */

import { defineConfig, defineDocs, frontmatterSchema, metaSchema } from 'fumadocs-mdx/config';
import { transformerTwoslash } from 'fumadocs-twoslash';
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: frontmatterSchema,
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerTwoslash(),
      ],
      langs: ['js', 'jsx', 'ts', 'tsx', 'json', 'bash', 'sh', 'yaml', 'md', 'mdx', 'diff'],
    },
  },
});
