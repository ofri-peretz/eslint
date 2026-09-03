/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
import { RootProvider } from 'fumadocs-ui/provider/next';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

/**
 * Configuration for an Interlace docs site's root metadata.
 *
 * Consumers call `createRootMetadata({...})` from their `app/layout.tsx`
 * and export the result as `metadata`.
 */
export interface RootMetadataConfig {
  /** Default page title (no template) */
  title: string;
  /** Title template for child pages, e.g. '%s | @interlace/serverless' */
  titleTemplate: string;
  /** Site-wide description — used in meta tags + OG */
  description: string;
  /** SEO keywords */
  keywords?: string[];
  /** Site canonical URL — used as metadataBase */
  metadataBase: string;
  /** Display name for OG/Twitter cards */
  siteName: string;
  /** Application name for accessibility/PWA */
  applicationName?: string;
  /** Open Graph image config */
  ogImage?: {
    url: string;
    width?: number;
    height?: number;
    alt?: string;
    type?: string;
  };
  /** Site icons (favicons, apple touch icon) */
  icons?: Metadata['icons'];
  /** Apple Web App config (status bar etc.) */
  appleWebApp?: Metadata['appleWebApp'];
  /** Author info — defaults to Ofri Peretz / ofriperetz.dev */
  author?: { name: string; url: string };
}

/**
 * Build a Next.js Metadata object with Interlace-standard SEO + social card config.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * export const metadata = createRootMetadata({
 *   title: '@interlace/serverless — TypeScript Serverless Plugins',
 *   titleTemplate: '%s | @interlace/serverless',
 *   description: 'TypeScript-native Serverless Framework plugins.',
 *   metadataBase: 'https://serverless.interlace.tools',
 *   siteName: '@interlace/serverless',
 *   applicationName: 'Interlace Serverless',
 * });
 * ```
 */
export function createRootMetadata(config: RootMetadataConfig): Metadata {
  const author = config.author ?? {
    name: 'Ofri Peretz',
    url: 'https://ofriperetz.dev',
  };

  const og: Metadata['openGraph'] = {
    type: 'website',
    locale: 'en_US',
    siteName: config.siteName,
    url: config.metadataBase,
    ...(config.ogImage
      ? {
          images: [
            {
              url: config.ogImage.url,
              width: config.ogImage.width ?? 1200,
              height: config.ogImage.height ?? 630,
              alt: config.ogImage.alt ?? config.siteName,
              type: config.ogImage.type ?? 'image/jpeg',
            },
          ],
        }
      : {}),
  };

  const twitter: Metadata['twitter'] = {
    card: 'summary_large_image',
    ...(config.ogImage ? { images: [config.ogImage.url] } : {}),
  };

  return {
    title: { default: config.title, template: config.titleTemplate },
    description: config.description,
    keywords: config.keywords,
    authors: [author],
    creator: author.name,
    metadataBase: new URL(config.metadataBase),
    openGraph: og,
    twitter,
    icons: config.icons,
    applicationName: config.applicationName,
    category: 'technology',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    appleWebApp: config.appleWebApp,
  };
}

/**
 * Optional extra <head> content (preconnect, dns-prefetch, etc.) that the
 * consumer can pass to `<DocsRootLayout>`.
 */
export interface DocsRootLayoutProps {
  children: ReactNode;
  /** Optional <head> children — preconnect/dns-prefetch hints, etc. */
  headExtras?: ReactNode;
  /** Override Inter; pass any next/font/google or local font className */
  fontClassName?: string;
}

/**
 * Standard Interlace docs root layout — wraps children in `<RootProvider>`
 * and applies the Inter font + a flex column body.
 *
 * Consumers can pass `headExtras` to inject site-specific preconnect/dns-prefetch.
 *
 * @example
 * ```tsx
 * export default function Layout({ children }: { children: ReactNode }) {
 *   return (
 *     <DocsRootLayout
 *       headExtras={<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />}
 *     >
 *       {children}
 *     </DocsRootLayout>
 *   );
 * }
 * ```
 */
export function DocsRootLayout({
  children,
  headExtras,
  fontClassName,
}: DocsRootLayoutProps) {
  return (
    <html lang="en" className={fontClassName ?? inter.className} suppressHydrationWarning>
      {headExtras ? <head>{headExtras}</head> : null}
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
