import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';

const inter = Inter({
  subsets: ['latin'],
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
  metadataBase: new URL('https://eslint.interlace.dev'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'ESLint Interlace',
  },
  twitter: {
    card: 'summary_large_image',
  },
  icons: {
    icon: '/eslint-interlace-logo.svg',
    apple: '/eslint-interlace-logo.svg',
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
