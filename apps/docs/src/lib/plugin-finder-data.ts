/**
 * Data layer for the plugin-finder page (`/plugins`).
 *
 * Single source of truth: `apps/docs/src/data/rules-manifest.json` holds the
 * per-rule facts (478 rules across 30 plugins). We aggregate those into a
 * compact per-plugin summary so the client component never ships the 400 KB
 * manifest — only the ~30-row summary it actually renders.
 *
 * `apps/docs/src/data/plugin-stats.json` supplies the human-readable
 * description, the `category` facet, and the published `version` — it is the
 * SSOT for plugin-level metadata (the manifest carries none of those). The
 * two are joined by package name.
 *
 * Docs-link mapping: the docs content tree only has `security/` and
 * `quality/` top-level dirs, so the five `plugin-stats.json` categories
 * collapse to two path segments — the same grouping `stats-loader.ts` uses
 * for coverage (security ∪ framework → security; quality ∪ react ∪
 * architecture → quality).
 */

import pluginStats from '@/data/plugin-stats.json';
import rulesManifest from '@/data/rules-manifest.json';

type PluginStatsCategory =
  | 'security'
  | 'framework'
  | 'quality'
  | 'react'
  | 'architecture';

interface PluginStatEntry {
  name: string;
  rules: number;
  description: string;
  category: PluginStatsCategory;
  version: string;
  published: boolean;
}

interface ManifestRule {
  plugin: string;
  prefix: string;
  rule: string;
  cwe: string | null;
  cvss: number | null;
  deprecated: boolean;
  recommended: 'error' | 'warn' | null;
  detection: object | null;
}

interface Manifest {
  totals: {
    plugins: number;
    rules: number;
    recommended: number;
    deprecated: number;
    withCwe: number;
    withDetection: number;
  };
  rules: ManifestRule[];
}

/** Compact, client-safe per-plugin summary. */
export interface PluginSummary {
  /** Full package name, e.g. `eslint-plugin-browser-security`. */
  name: string;
  /** Slug without the `eslint-plugin-` prefix, e.g. `browser-security`. */
  slug: string;
  /** Rule prefix, e.g. `browser-security`. */
  prefix: string;
  /** Category facet from plugin-stats.json. */
  category: PluginStatsCategory;
  /** Human-readable description from plugin-stats.json. */
  description: string;
  /** Published version from plugin-stats.json. */
  version: string;
  /** Total rules in this plugin (counted from the manifest). */
  rules: number;
  /** Rules whose `recommended` is non-null (error or warn). */
  recommended: number;
  /** Rules flagged `deprecated`. */
  deprecated: number;
  /** Rules carrying a CWE mapping. */
  withCwe: number;
  /** Highest CVSS score among the plugin's rules, null if none scored. */
  maxCvss: number | null;
  /** Rules with detection metrics (precision/recall) recorded. */
  withDetection: number;
  /** Docs path, e.g. `/docs/security/plugin-browser-security`. */
  docsHref: string;
}

/** Map a plugin-stats category to the docs content path segment. */
function docsPathSegment(category: PluginStatsCategory): 'security' | 'quality' {
  return category === 'security' || category === 'framework'
    ? 'security'
    : 'quality';
}

/**
 * Aggregate the rule manifest into one row per plugin, joined with the
 * plugin-stats catalog for description / category / version. Server-only —
 * reads the committed JSON at build time.
 */
export function getPluginFinderData(): PluginSummary[] {
  const manifest = rulesManifest as Manifest;
  const stats = pluginStats as { plugins: PluginStatEntry[] };

  const statsByName = new Map<string, PluginStatEntry>();
  for (const p of stats.plugins) {
    statsByName.set(p.name, p);
  }

  // Tally rule-level facts per plugin from the manifest.
  const tally = new Map<
    string,
    {
      rules: number;
      recommended: number;
      deprecated: number;
      withCwe: number;
      maxCvss: number;
      withDetection: number;
      prefix: string;
    }
  >();

  for (const r of manifest.rules) {
    let t = tally.get(r.plugin);
    if (!t) {
      t = {
        rules: 0,
        recommended: 0,
        deprecated: 0,
        withCwe: 0,
        maxCvss: 0,
        withDetection: 0,
        prefix: r.prefix,
      };
      tally.set(r.plugin, t);
    }
    t.rules += 1;
    if (r.recommended !== null) t.recommended += 1;
    if (r.deprecated) t.deprecated += 1;
    if (r.cwe) t.withCwe += 1;
    if (typeof r.cvss === 'number' && r.cvss > t.maxCvss) t.maxCvss = r.cvss;
    if (r.detection) t.withDetection += 1;
  }

  const summaries: PluginSummary[] = [];

  for (const [name, t] of tally) {
    const stat = statsByName.get(name);
    const category: PluginStatsCategory = stat?.category ?? 'quality';
    const slug = name.replace(/^eslint-plugin-/, '');
    summaries.push({
      name,
      slug,
      prefix: t.prefix,
      category,
      description: stat?.description ?? '',
      version: stat?.version ?? '',
      rules: t.rules,
      recommended: t.recommended,
      deprecated: t.deprecated,
      withCwe: t.withCwe,
      maxCvss: t.maxCvss > 0 ? t.maxCvss : null,
      withDetection: t.withDetection,
      docsHref: `/docs/${docsPathSegment(category)}/plugin-${slug}`,
    });
  }

  // Default sort: most rules first — the plugins that cover the most surface
  // are the most likely starting point for a visitor.
  summaries.sort((a, b) => b.rules - a.rules || a.slug.localeCompare(b.slug));
  return summaries;
}

/** Category metadata for the filter facet, ordered by typical visitor intent. */
export const PLUGIN_CATEGORIES: {
  value: PluginStatsCategory;
  label: string;
}[] = [
  { value: 'security', label: 'Security' },
  { value: 'framework', label: 'Framework' },
  { value: 'react', label: 'React' },
  { value: 'quality', label: 'Quality' },
  { value: 'architecture', label: 'Architecture' },
];
