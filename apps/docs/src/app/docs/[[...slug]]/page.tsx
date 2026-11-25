import { getPageImage, source } from '@/lib/source';
import { TocNav } from '@/components/docs/toc-nav';
import { TOCProvider, TOCPopover } from 'fumadocs-ui/layouts/docs/page/slots/toc';
import { canonicalDocsUrl } from '@/lib/site-config';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/mdx-components';
import { RuleCTAExperiment } from '@/components/docs/rule-cta-experiment';
import { DocsFooterCTA } from '@/components/docs/docs-footer-cta';
import { EngineSetup } from '@/components/docs/engine-setup';
import { GitHubCard } from '@/components/docs/github-card';
import { RuleNextStep } from '@/components/docs/rule-next-step';
import { getGitHubStars } from '@/lib/github-stars';
import { JsonLd } from '@/components/json-ld';
import { docsSeo } from '@/lib/docs-seo';
import type { TableOfContents } from 'fumadocs-core/toc';
import type { MDXComponents } from 'mdx/types';
import type { ReactElement } from 'react';

// Extended page data type that includes MDX-processed fields
interface ProcessedPageData {
  title?: string;
  description?: string;
  body: (props: { components?: MDXComponents }) => ReactElement;
  toc: TableOfContents;
}

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  // Cast to include MDX-processed fields (body, toc)
  const pageData = page.data as unknown as ProcessedPageData;
  const MDX = pageData.body;

  // Peak-value conversion CTA on rule pages: the slug is
  // [...category, 'plugin-<name>', 'rules', '<rule>']. This is the page reached
  // from the editor's "see docs" link — i.e. right after the rule caught
  // something in the reader's code (the highest-gratitude moment we have).
  const slug = params.slug ?? [];
  const rulesIdx = slug.indexOf('rules');
  const isRulePage = rulesIdx > 0 && rulesIdx < slug.length - 1;
  const rulePlugin = isRulePage ? slug[rulesIdx - 1].replace(/^plugin-/, '') : '';
  const ruleName = isRulePage ? slug[rulesIdx + 1] : '';
  const seo = docsSeo(page);
  const stars = await getGitHubStars();

  return (
    <DocsPage
      toc={pageData.toc}
      tableOfContent={{
        style: 'clerk',
        enabled: true,
      }}
      // The TOC goes inside a navigation landmark. fumadocs renders it as a
      // bare div, and since 16.14.5 nothing else covers it — see TocNav.
      slots={{ toc: { provider: TOCProvider, main: TocNav, popover: TOCPopover } }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>
        {seo.visibleDescription ?? page.data.description}
      </DocsDescription>
      {/* schema.org: TechArticle (rules, guides) or SoftwareSourceCode
          (plugins), plus a BreadcrumbList, in the server HTML. */}
      <JsonLd data={seo.jsonLd} />
      <DocsBody>
        {/* Narrow screens only: the sidebar card is a drawer there. */}
        <GitHubCard stars={stars} variant="inline" />
        {/* After the rule summary (the description above): where the plugin,
            its install line and config, and the way on to the plugin page. */}
        {isRulePage && ruleName ? (
          <RuleNextStep plugin={rulePlugin} rule={ruleName} />
        ) : null}
        {/* Both slots render; the experiment component decides which one is
            visible, so the server stays static and the choice is client-side. */}
        {isRulePage && ruleName ? (
          <RuleCTAExperiment plugin={rulePlugin} rule={ruleName} placement="top" />
        ) : null}
        <MDX components={getMDXComponents()} />
        {/* Every rule page: install + config for both engines, oxlint first,
            derived from the slug — 500+ rule pages, none of them hand-edited. */}
        {isRulePage && ruleName ? (
          <>
            <h2 id="use-this-rule">Use this rule</h2>
            <EngineSetup plugin={rulePlugin} rule={ruleName} />
          </>
        ) : null}
        {isRulePage && ruleName ? (
          <RuleCTAExperiment
            plugin={rulePlugin}
            rule={ruleName}
            placement="bottom"
          />
        ) : (
          <DocsFooterCTA slug={slug.join('/')} />
        )}
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const path = params.slug ? params.slug.join('/') : '';
  const url = canonicalDocsUrl(path);
  // Query-shaped title and a unique description per page — see @/lib/seo.
  const seo = docsSeo(page);
  const ogTitle = typeof seo.title === 'string' ? seo.title : seo.title.absolute;

  return {
    title: seo.title,
    description: seo.description,
    bookmarks: [url],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: ogTitle,
      description: seo.description,
      type: 'article',
      ...(seo.dateModified ? { modifiedTime: seo.dateModified } : {}),
      // The per-page generator at /og/docs/[...slug] existed for months while
      // nothing referenced it, so every docs share card fell back to the
      // site-wide default. Point at it: rule pages are the pages people share.
      images: getPageImage(page).url,
    },
  };
}
