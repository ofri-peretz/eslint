'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Badge } from '@interlace/ui/badge';
import { Card, CardContent } from '@interlace/ui/card';

import type { PluginSummary } from '@/lib/plugin-finder-data';

/**
 * Presentational card for one plugin in the finder grid. Receives a
 * pre-aggregated `PluginSummary` (built server-side from the rules manifest)
 * and renders the decision-relevant facts: category, description, rule
 * count, recommended count, CWE coverage, and a link to the plugin's docs.
 *
 * Not interactive beyond the docs link — filtering happens in the parent.
 */
const CATEGORY_LABEL: Record<string, string> = {
  security: 'Security',
  framework: 'Framework',
  react: 'React',
  quality: 'Quality',
  architecture: 'Architecture',
};

export function PluginCard({ plugin }: { plugin: PluginSummary }) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-4 px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-mono text-sm font-semibold">
              {plugin.slug}
            </h3>
            <p className="mt-1 text-xs text-fd-muted-foreground">
              v{plugin.version}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0">
            {CATEGORY_LABEL[plugin.category] ?? plugin.category}
          </Badge>
        </div>

        <p className="text-sm text-fd-muted-foreground line-clamp-3">
          {plugin.description}
        </p>

        <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-fd-border pt-4 text-center">
          <div>
            <dt className="text-[0.65rem] uppercase tracking-wide text-fd-muted-foreground">
              Rules
            </dt>
            <dd className="tabular-nums text-lg font-semibold">{plugin.rules}</dd>
          </div>
          <div>
            <dt className="text-[0.65rem] uppercase tracking-wide text-fd-muted-foreground">
              Recommended
            </dt>
            <dd className="tabular-nums text-lg font-semibold">
              {plugin.recommended}
            </dd>
          </div>
          <div>
            <dt className="text-[0.65rem] uppercase tracking-wide text-fd-muted-foreground">
              CWE-mapped
            </dt>
            <dd className="tabular-nums text-lg font-semibold">
              {plugin.withCwe}
            </dd>
          </div>
        </dl>

        <Link
          href={plugin.docsHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-fd-primary hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring rounded-sm"
        >
          View docs
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
