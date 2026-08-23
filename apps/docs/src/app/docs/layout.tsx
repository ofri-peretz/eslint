import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { Rocket, Shield, Layers } from 'lucide-react';

// Define colored icons for each pillar - sized to fit sidebar tabs
const pillarIcons: Record<string, React.ReactNode> = {
  'getting-started': (
    <div className="flex size-5 shrink-0 items-center justify-center rounded bg-linear-to-t from-blue-600 to-blue-500 text-white">
      <Rocket className="size-3.5" />
    </div>
  ),
  security: (
    <div className="flex size-5 shrink-0 items-center justify-center rounded bg-linear-to-t from-red-600 to-red-500 text-white">
      <Shield className="size-3.5" />
    </div>
  ),
  quality: (
    <div className="flex size-5 shrink-0 items-center justify-center rounded bg-linear-to-t from-emerald-600 to-emerald-500 text-white">
      <Layers className="size-3.5" />
    </div>
  ),
};

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...baseOptions()}
      sidebar={{
        tabs: {
          transform: (option, node) => {
            // Use folder name directly from node
            const nodeName = typeof node.name === 'string' ? node.name : '';
            const folderName = nodeName.toLowerCase().replace(/\s+/g, '-');
            // Map display names to folder slugs
            const nameToSlug: Record<string, string> = {
              'getting started': 'getting-started',
              'security': 'security',
              'quality & architecture': 'quality',
            };
            const slug = nameToSlug[nodeName.toLowerCase()] || folderName;
            return {
              ...option,
              icon: pillarIcons[slug] || option.icon,
            };
          },
        },
        defaultOpenLevel: 1,
      }}
    >
      {/* A focusable wrapper, NOT a landmark.
          
          This was `<main id="main-content">`, added because fumadocs rendered
          `<article>` for the page body and no `<main>`, so axe's
          `landmark-one-main` failed without it. fumadocs-ui 16.14.5 changed
          that: it now renders `<main>` from
          `layouts/docs/page/slots/container`, where 16.14.2 did not. Two
          landmarks then failed the same check from the other direction —
          "exactly one <main>" — across six a11y tests.
          
          A `div` keeps the skip link working (it stays focusable via
          `tabIndex={-1}`) and leaves fumadocs to own the landmark, which is
          what every other route here already does: see `(home)/page.tsx`,
          `articles/page.tsx` and `scorecard/page.tsx`, all of which target a
          div for exactly this reason. This route was the last one still
          providing its own. */}
      <div id="main-content" tabIndex={-1} className="contents outline-hidden">
        {children}
      </div>
    </DocsLayout>
  );
}

