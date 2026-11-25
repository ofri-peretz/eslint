/**
 * Per-page search metadata for the docs route: the fumadocs `source` side of
 * `@/lib/seo` (which stays pure so lock tests can run it without a build).
 */
import type { InferPageType } from 'fumadocs-core/source';

import { source } from '@/lib/source';
import {
  breadcrumbList,
  classifyDocsSlugs,
  docsDateModified,
  jsonLdGraph,
  pluginDescription,
  pluginSourceCode,
  pluginTitle,
  ruleDescription,
  ruleSummary,
  ruleTechArticle,
  ruleTitle,
  techArticle,
  type Crumb,
} from '@/lib/seo';

type DocsPage = InferPageType<typeof source>;

export interface DocsSeo {
  /** `absolute` skips the root `%s | ESLint Interlace` template. */
  title: string | { absolute: string };
  description: string;
  /** Sentence shown under the H1; the frontmatter's unless it is a placeholder. */
  visibleDescription?: string;
  jsonLd: object;
  dateModified?: string;
}

let duplicateTitles: Set<string> | undefined;

/** Titles that more than one docs page uses ("Rules", "Changelog", …). */
function duplicates(): Set<string> {
  if (duplicateTitles) return duplicateTitles;
  const seen = new Map<string, number>();
  for (const p of source.getPages()) {
    const t = p.data.title ?? '';
    seen.set(t, (seen.get(t) ?? 0) + 1);
  }
  duplicateTitles = new Set([...seen].filter(([, n]) => n > 1).map(([t]) => t));
  return duplicateTitles;
}

/** Home → each ancestor that is a page → this page. */
function crumbs(page: DocsPage, name: string): Crumb[] {
  const list: Crumb[] = [{ name: 'Home', path: '/' }];
  for (let i = 1; i < page.slugs.length; i++) {
    const ancestor = source.getPage(page.slugs.slice(0, i));
    if (ancestor)
      list.push({
        name: ancestor.data.title ?? ancestor.slugs[i - 1],
        path: ancestor.url,
      });
  }
  list.push({ name, path: page.url });
  return list;
}

function parentTitle(page: DocsPage): string | undefined {
  for (let i = page.slugs.length - 1; i > 0; i--) {
    const ancestor = source.getPage(page.slugs.slice(0, i));
    if (ancestor?.data.title) return ancestor.data.title;
  }
  return undefined;
}

export function docsSeo(page: DocsPage): DocsSeo {
  const kind = classifyDocsSlugs(page.slugs);
  const fmTitle = page.data.title ?? page.slugs.at(-1) ?? 'Docs';
  const fmDescription = page.data.description;
  const dateModified = docsDateModified(page.path, page.slugs);
  const pluginPath = (plugin: string) => {
    const at = page.slugs.indexOf(`plugin-${plugin}`);
    return `/docs/${page.slugs.slice(0, at + 1).join('/')}`;
  };

  if (kind.kind === 'rule') {
    const summary = ruleSummary(kind.plugin, kind.rule, fmDescription);
    const title = ruleTitle(kind.plugin, kind.rule, summary);
    const description = ruleDescription(kind.plugin, kind.rule, summary);
    const headline = title.replace(/ \| [^|]+$/, '');
    return {
      title: { absolute: title },
      description,
      visibleDescription: summary,
      dateModified,
      jsonLd: jsonLdGraph(
        ruleTechArticle({
          plugin: kind.plugin,
          rule: kind.rule,
          path: page.url,
          pluginPath: pluginPath(kind.plugin),
          headline,
          description,
          dateModified,
        }),
        breadcrumbList(crumbs(page, kind.rule)),
      ),
    };
  }

  if (kind.kind === 'plugin') {
    const title = pluginTitle(kind.plugin);
    const description = pluginDescription(kind.plugin, fmDescription);
    return {
      title: { absolute: title },
      description,
      dateModified,
      jsonLd: jsonLdGraph(
        pluginSourceCode(kind.plugin, {
          path: page.url,
          description,
          dateModified,
        }),
        breadcrumbList(crumbs(page, fmTitle)),
      ),
    };
  }

  let title = fmTitle;
  if (kind.kind === 'rules-index')
    title = `All eslint-plugin-${kind.plugin} rules`;
  else if (kind.kind === 'changelog')
    title = `eslint-plugin-${kind.plugin} changelog and releases`;
  else if (duplicates().has(fmTitle)) {
    const parent = parentTitle(page);
    if (parent) title = `${fmTitle}: ${parent}`;
  }
  const description =
    fmDescription ?? `${title}, ESLint Interlace documentation`;
  return {
    title,
    description,
    dateModified,
    jsonLd: jsonLdGraph(
      techArticle({
        path: page.url,
        headline: title,
        description,
        dateModified,
      }),
      breadcrumbList(crumbs(page, fmTitle)),
    ),
  };
}
