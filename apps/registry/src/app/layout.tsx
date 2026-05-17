import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Interlace Design System Registry',
    template: '%s — Interlace DS',
  },
  description:
    'Shadcn-compatible component registry for @interlace/ui. Production-grade React primitives, drop-in via the shadcn CLI.',
  metadataBase: new URL('https://ds.interlace.tools'),
  openGraph: {
    title: 'Interlace Design System Registry',
    description: 'Production-grade React primitives, shadcn-compatible.',
    url: 'https://ds.interlace.tools',
    siteName: 'Interlace DS',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Interlace Design System Registry',
    description: 'Production-grade React primitives, shadcn-compatible.',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
