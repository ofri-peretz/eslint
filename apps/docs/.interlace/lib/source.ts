/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * Fumadocs source loader — shared across all Interlace docs sites.
 *
 * Re-export `source` and `getLLMText` from this file in each consumer.
 * Both consumers' `app/llms.txt/route.ts` and `app/llms-full.txt/route.ts`
 * import from here.
 */

import { docs } from 'fumadocs-mdx:collections/server';
import { type InferPageType, loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, 'image.png'];
  return {
    segments,
    url: `/og/docs/${segments.join('/')}`,
  };
}

interface PageDataWithText {
  title?: string;
  getText?: (format: string) => Promise<string>;
}

export async function getLLMText(page: InferPageType<typeof source>) {
  const data = page.data as unknown as PageDataWithText;

  if (typeof data.getText === 'function') {
    const processed = await data.getText('processed');
    return `# ${data.title ?? 'Untitled'}\n\n${processed}`;
  }

  return `# ${data.title ?? 'Untitled'}`;
}

/**
 * Shape consumed by `components/home/devto-articles.tsx`. Locked here so any
 * future articles wire-up matches the rendered card — see that component
 * for the full set of fields it reads.
 */
export interface BaselineArticle {
  slug: string;
  readingTimeMinutes: number;
  frontmatter: {
    title: string;
    description?: string;
    published_at?: string;
    reactions?: number;
    comments?: number;
  };
}

/**
 * Articles index for the landing-page "Latest articles" section.
 *
 * Placeholder: returns an empty array. The matching `<DevToArticles>` component
 * already short-circuits on `articles.length === 0`, so the section is hidden
 * until a real collection is wired up. To enable, replace this body with a
 * fumadocs source loader (a sibling collection to `docs`) that yields
 * `BaselineArticle[]`. Do NOT change the return type — `<DevToArticles>` is
 * pinned to the shape above.
 */
export function getAllArticles(): BaselineArticle[] {
  return [];
}
