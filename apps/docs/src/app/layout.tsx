import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import { TooltipProvider } from '#interlace/components/ui/tooltip';
import { CodeBlockLabeller } from '@/components/a11y/code-block-labeller';
import { SITE_ORIGIN } from '@/lib/site-config';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: 'ESLint Interlace - Security & Quality for JavaScript',
    template: '%s | ESLint Interlace',
  },
  description:
    'Comprehensive ESLint plugins for security vulnerabilities, code quality, and architecture governance in JavaScript and TypeScript projects.',
  keywords: [
    'ESLint',
    'security',
    'JavaScript',
    'TypeScript',
    'code quality',
    'static analysis',
    'linting',
    'OWASP',
  ],
  authors: [{ name: 'Ofri Peretz', url: 'https://ofriperetz.dev' }],
  creator: 'Ofri Peretz',
  metadataBase: new URL(SITE_ORIGIN),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'ESLint Interlace',
    url: SITE_ORIGIN,
    images: [
      {
        url: '/og-image.jpg?v=1.1', // Cache buster to force social platforms to re-fetch
        width: 1200,
        height: 630,
        alt: 'Interlace ESLint - Enterprise Node.js Security',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ["/og-image.jpg?v=1.1"],
  },
  icons: {
    icon: [
      { url: '/icon-light.svg', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark.svg', media: '(prefers-color-scheme: dark)' },
    ],
    apple: '/eslint-interlace-logo.svg',
  },
  applicationName: 'Interlace ESLint',
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
  appleWebApp: {
    capable: true,
    title: 'Interlace',
    statusBarStyle: 'black-translucent',
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <head>
        {/* DNS prefetch for external domains - reduces lookup time */}
        <link rel="dns-prefetch" href="https://media.dev.to" />
        <link rel="dns-prefetch" href="https://dev-to-uploads.s3.amazonaws.com" />
        <link rel="dns-prefetch" href="https://avatars.githubusercontent.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="flex flex-col min-h-screen">
        {/* Skip link — MUST be the first focusable element in the body so
            keyboard users (Safari + Full Keyboard Access on; any browser)
            can bypass the fumadocs nav and jump straight to the page's
            <main id="main-content"> landmark. Visually hidden via sr-only
            until focused; revealed as a high-contrast brand pill on focus.
            See KEYBOARD_PHILOSOPHY.md #1. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-md focus:bg-fd-primary focus:px-4 focus:py-2 focus:font-medium focus:text-fd-primary-foreground focus:shadow-lg focus:outline-hidden focus:ring-2 focus:ring-fd-ring"
        >
          Skip to main content
        </a>
        {/* Dark is the default theme — branded cosmic hero looks best on a dark
            canvas, and the rest of the surface is AAA-tuned for near-black. */}
        <RootProvider theme={{ defaultTheme: 'dark' }}>
          <TooltipProvider delay={250}>{children}</TooltipProvider>
          <CodeBlockLabeller />
        </RootProvider>
      </body>
    </html>
  );
}
