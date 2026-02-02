import { source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/mdx-components';
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

  return (
    <DocsPage
      toc={pageData.toc}
      tableOfContent={{
        style: 'clerk',
        enabled: true,
        
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents()} />
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

  return {
    title: page.data.title,
    description: page.data.description ?? 'ESLint Interlace documentation',
  };
}
