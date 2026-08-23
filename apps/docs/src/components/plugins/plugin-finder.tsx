'use client';

import * as React from 'react';
import { Search } from 'lucide-react';

import { Badge } from '@interlace/ui/badge';
import { Input } from '@interlace/ui/input';
import { Switch } from '@interlace/ui/switch';
import { cn } from '@interlace/ui/cn';

import { PluginCard } from './plugin-card';
import {
  PLUGIN_CATEGORIES,
  type PluginSummary,
} from '@/lib/plugin-finder-data';

type CategoryValue = (typeof PLUGIN_CATEGORIES)[number]['value'] | 'all';

type SortKey = 'rules' | 'az' | 'recommended';

/**
 * Client-side plugin finder. Receives the pre-aggregated `PluginSummary[]`
 * (built server-side from the rules manifest) and lets a visitor narrow the
 * 30+ plugins by category, search, and recommended-only, then sort the
 * result. All state is local — no network, no server round-trips.
 *
 * Accessibility:
 *  - The search `<Input>` has a visible `<label>`.
 *  - Category toggles are real `<button>`s with `aria-pressed`.
 *  - The results count is in an `aria-live` region so screen readers announce
 *    filter changes.
 *  - Every card's "View docs" link is a real focusable `<Link>`.
 */
export function PluginFinder({ plugins }: { plugins: PluginSummary[] }) {
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState<CategoryValue>('all');
  const [recommendedOnly, setRecommendedOnly] = React.useState(false);
  const [sort, setSort] = React.useState<SortKey>('rules');

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = plugins.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (recommendedOnly && p.recommended === 0) return false;
      if (q) {
        const haystack = `${p.slug} ${p.name} ${p.description}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sort === 'az') return a.slug.localeCompare(b.slug);
      if (sort === 'recommended') return b.recommended - a.recommended;
      return b.rules - a.rules || a.slug.localeCompare(b.slug);
    });
    return list;
  }, [plugins, query, category, recommendedOnly, sort]);

  return (
    <div className="flex flex-col gap-8">
      {/* Filter controls */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="plugin-finder-search"
            className="text-sm font-medium"
          >
            Search plugins
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fd-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="plugin-finder-search"
              type="search"
              placeholder="e.g. express, sql, react, prompt injection…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoComplete="off"
            />
          </div>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium">Category</legend>
          <div
            role="group"
            aria-label="Filter by category"
            className="flex flex-wrap gap-2"
          >
            <CategoryButton
              active={category === 'all'}
              onClick={() => setCategory('all')}
            >
              All
            </CategoryButton>
            {PLUGIN_CATEGORIES.map((c) => (
              <CategoryButton
                key={c.value}
                active={category === c.value}
                onClick={() => setCategory(c.value)}
              >
                {c.label}
              </CategoryButton>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="flex items-center gap-2.5 text-sm font-medium">
            <Switch
              checked={recommendedOnly}
              onCheckedChange={setRecommendedOnly}
              aria-label="Show only plugins with recommended rules"
            />
            Recommended rules only
          </label>

          <div className="flex items-center gap-2">
            <label
              htmlFor="plugin-finder-sort"
              className="text-sm font-medium"
            >
              Sort by
            </label>
            <select
              id="plugin-finder-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-md border border-fd-border bg-fd-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
            >
              <option value="rules">Most rules</option>
              <option value="recommended">Most recommended</option>
              <option value="az">A–Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results count — announced on change */}
      <p
        aria-live="polite"
        className="text-sm text-fd-muted-foreground"
      >
        Showing{' '}
        <span className="font-semibold text-fd-foreground">
          {filtered.length}
        </span>{' '}
        of {plugins.length} plugins
      </p>

      {/* Results grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <PluginCard key={p.name} plugin={p} />
          ))}
        </div>
      ) : (
        <div
          className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-fd-border py-16 text-center"
        >
          <Badge variant="secondary">No matches</Badge>
          <p className="text-sm text-fd-muted-foreground">
            No plugins match your filters. Try clearing the search or choosing
            “All”.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setCategory('all');
              setRecommendedOnly(false);
            }}
            className="text-sm font-medium text-fd-primary hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring rounded-sm"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
        active
          ? 'border-fd-primary bg-fd-primary text-fd-primary-foreground'
          : 'border-fd-border bg-fd-background text-fd-foreground hover:bg-fd-accent',
      )}
    >
      {children}
    </button>
  );
}
