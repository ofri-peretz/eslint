import { source } from '@/lib/source';
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
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        {/* Both slots render; the experiment component decides which one is
            visible, so the server stays static and the choice is client-side. */}
        {isRulePage && ruleName ? (
          <RuleCTAExperiment plugin={rulePlugin} rule={ruleName} placement="top" />
        ) : null}
        <MDX components={getMDXComponents()} />
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

  return {
    title: page.data.title,
    description: page.data.description ?? 'ESLint Interlace documentation',
    bookmarks: [url],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: page.data.title,
      description: page.data.description ?? 'ESLint Interlace documentation',
      // We rely on the root layout for the default image, 
      // but individual pages could override if they had specific images.
    },
  };
}
