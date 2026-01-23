import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { Analytics } from '@vercel/analytics/next';
import './global.css';
import { Space_Grotesk } from 'next/font/google';
import { Providers } from '@/components/Providers';


// Build trigger: 2026-01-17T21:20
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

import pluginData from '@/data/plugin-stats.json';

// Base URL for canonical URLs and OG images
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://interlace-eslint.vercel.app';

const totalRules = pluginData.totalRules;
const totalPlugins = pluginData.totalPlugins;

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'ESLint Interlace | Security-First ESLint Plugins',
    template: '%s | ESLint Interlace',
  },
  description:
    `${totalRules}+ security rules across ${totalPlugins} specialized ESLint plugins. LLM-optimized error messages with CWE, OWASP, and CVSS metadata. Full OWASP Top 10 coverage.`,
  keywords: [
    'eslint',
    'eslint-plugin',
    'security',
    'owasp',
    'cwe',
    'cvss',
    'sql-injection',
    'xss',
    'javascript',
    'typescript',
    'static-analysis',
    'code-security',
    'llm-optimized',
    'ai-assistant',
    'github-copilot',
    'cursor-ai',
  ],
  authors: [{ name: 'Ofri Peretz', url: 'https://ofriperetz.dev' }],
  creator: 'Ofri Peretz',
  publisher: 'Interlace ESLint',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/eslint-interlace-logo.svg', type: 'image/svg+xml' },
    ],
    apple: '/eslint-interlace-logo.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'ESLint Interlace',
    title: 'Interlace ESLint | Security-First ESLint Plugins',
    description:
      `${totalRules}+ security rules across ${totalPlugins} specialized ESLint plugins. LLM-optimized error messages with CWE, OWASP, and CVSS metadata.`,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Interlace ESLint - Security-First ESLint Plugins',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Interlace ESLint | Security-First ESLint Plugins',
    description:
      `${totalRules}+ security rules across ${totalPlugins} specialized ESLint plugins. LLM-optimized with CWE, OWASP, CVSS metadata.`,
    images: ['/og-image.png'],
    creator: '@AnyWayPod',
  },
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
  alternates: {
    canonical: baseUrl,
  },
  verification: {
    // Add verification tokens when ready
    // google: 'your-google-verification-token',
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={spaceGrotesk.className} suppressHydrationWarning>
      <head>
        {/* Preconnect for external APIs */}
        <link rel="preconnect" href="https://dev.to" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <meta name="version" content={process.env.NEXT_PUBLIC_APP_VERSION} />
        <link rel="dns-prefetch" href="https://codecov.io" />
        
        {/* PWA theme color */}
        <meta name="theme-color" content="#7c3aed" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1e1b4b" media="(prefers-color-scheme: dark)" />
        
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Structured Data for Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'ESLint Interlace',
              applicationCategory: 'DeveloperApplication',
              operatingSystem: 'Any',
              description:
                `${totalRules}+ security rules across ${totalPlugins} specialized ESLint plugins with LLM-optimized error messages.`,
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              author: {
                '@type': 'Person',
                name: 'Ofri Peretz',
                url: 'https://ofriperetz.dev',
              },
            }),
          }}
        />
      </head>
      <body className="flex flex-col min-h-screen" suppressHydrationWarning>
        <Providers>
          <RootProvider>{children}</RootProvider>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}

