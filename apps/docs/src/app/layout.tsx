import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';

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
  authors: [{ name: 'Interlace' }],
  creator: 'Interlace',
  metadataBase: new URL('https://eslint.interlace.tools'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'ESLint Interlace',
    images: ["/og-image.png"],
  },
  twitter: {
    card: 'summary_large_image',
    images: ["/og-image.png"],
  },
  icons: {
    icon: '/eslint-interlace-logo.svg',
    apple: '/eslint-interlace-logo.svg',
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
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
