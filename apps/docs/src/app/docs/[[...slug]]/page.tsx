import { getPageImage, source } from '@/lib/source';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/mdx-components';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { Breadcrumb } from '@/components/Breadcrumb';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full} breadcrumb={{ enabled: false }}>
      <Breadcrumb tree={source.pageTree} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://eslint.interlace.tools';

const OG_IMAGE_MAP: Record<string, string> = {
  'browser-security': 'og-browser-security.png',
  'crypto': 'og-crypto.png',
  'jwt': 'og-jwt.png',
  'pg': 'og-pg.png',
  'postgres': 'og-pg.png',
  'mongodb-security': 'og-mongodb-security.png',
  'mongo': 'og-mongodb-security.png',
  'react-features': 'og-react-features.png',
  'react-a11y': 'og-react-a11y.png',
  'react': 'og-react-a11y.png',
  'nestjs-security': 'og-nestjs-security.png',
  'nest': 'og-nestjs-security.png',
  'express-security': 'og-express-security.png',
  'express': 'og-express-security.png',
  'lambda-security': 'og-lambda-security.png',
  'lambda': 'og-lambda-security.png',
  'backend': 'og-backend.png',
  'secure-coding': 'og-secure-coding.png',
  'import-next': 'og-import-next.png',
  'architecture': 'og-architecture.png',
  'vercel-ai-security': 'og-vercel-ai-security.png',
  'ai': 'og-vercel-ai-security.png',
  'quality': 'og-quality.png',
};

function getStaticOgImage(slugs: string[]): string {
  // Check if any segment in the slug matches our known categories
  for (const segment of slugs) {
    for (const [key, image] of Object.entries(OG_IMAGE_MAP)) {
      if (segment.includes(key)) {
        return `${baseUrl}/images/${image}`;
      }
    }
  }
  // Default fallback
  return `${baseUrl}/images/interlace-hero.png`;
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const slugPath = page.slugs.join('/');
  const canonicalUrl = slugPath ? `${baseUrl}/docs/${slugPath}` : `${baseUrl}/docs`;
  
  // Use our high-fidelity static images instead of dynamic generation
  const ogImageUrl = getStaticOgImage(page.slugs);

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'article',
      url: canonicalUrl,
      title: page.data.title,
      description: page.data.description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: page.data.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.data.title,
      description: page.data.description,
      images: [ogImageUrl],
    },
  };
}
