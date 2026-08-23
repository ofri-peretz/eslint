import type { Metadata } from 'next';

import { Section } from '@interlace/ui/section';
import { SectionHeader } from '@interlace/ui/blocks/section-header';

import { PluginFinder } from '@/components/plugins/plugin-finder';
import {
  getPluginFinderData,
  PLUGIN_CATEGORIES,
} from '@/lib/plugin-finder-data';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Plugins',
  description:
    'Find the right Interlace ESLint plugins for your stack. Filter 30+ plugins by category, search by technology, and sort by rule coverage — all driven by the live rules manifest.',
  alternates: { canonical: '/plugins' },
  openGraph: {
    title: 'Plugins | ESLint Interlace',
    description:
      'Find the right Interlace ESLint plugins for your stack — filter, search, and compare 30+ plugins.',
    type: 'website',
    url: '/plugins',
  },
};

/**
 * Plugin finder — helps a visitor decide which of the 30+ ESLint plugins they
 * need. The page is a thin server shell: it aggregates the rules manifest into
 * a compact per-plugin summary (see `plugin-finder-data.ts`) and hands it to
 * the client `<PluginFinder>` for filtering. Route and design are mobile-first
 * and keyboard-accessible, built on the project's layout primitives.
 *
 * Structural lock: `src/__tests__/plugin-finder-lock.test.tsx` pins the
 * required imports, the section id, and forbids open-coded section wrappers /
 * `max-w-*` ad-hoc widths per LAYOUT_PHILOSOPHY.md.
 */
export default function PluginsPage() {
  const plugins = getPluginFinderData();
  const categoryCount = PLUGIN_CATEGORIES.length;

  return (
    <Section spacing="comfortable" container="wide" id="plugin-finder">
      <SectionHeader
        as="h1"
        align="start"
        eyebrow={`${plugins.length} plugins · ${categoryCount} categories`}
        title="Find your plugins"
        tagline="Thirty-plus ESLint plugins is a lot to scan. Filter by what you build with, search by name or technology, and compare rule coverage — every number is driven by the live rules manifest."
      />

      <PluginFinder plugins={plugins} />
    </Section>
  );
}
