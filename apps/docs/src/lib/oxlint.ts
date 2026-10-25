/**
 * oxlint / Vite+ data for the docs: alias package names, the preset each
 * plugin page shows, and the map of our rules that oxlint also ships built in.
 *
 * Server-only: reads the repo at build time, like `plugin-content.ts`.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import manifest from '@/data/rules-manifest.json';
import { PLUGINS } from '@/lib/plugins';

/**
 * Shape of `docs/oxlint-builtin-overlap.json`, written by
 * `scripts/oxlint-builtin-overlap.ts` from the installed oxlint.
 */
export interface OxlintOverlap {
  generatedAt: string;
  oxlintVersion: string;
  builtinRuleCount: number;
  /** One entry per (our rule, oxlint built-in) pair whose rule names match, triaged. */
  overlap: Array<{
    /** Our rule ID, `<plugin>/<rule>`. */
    id: string;
    /** Our plugin slug. */
    plugin: string;
    rule: string;
    /** oxlint's built-in, `<builtin-plugin>/<rule>`. */
    builtin: string;
    /** A shared name is only a candidate; `false-positive` means unrelated rules. */
    verdict: 'equivalent' | 'differs' | 'false-positive';
    note?: string;
  }>;
}

const REPO_ROOT = path.resolve(
  /*turbopackIgnore: true*/ process.cwd(),
  '../..',
);

export const oxlintAliasPackage = (slug: string) => `oxlint-plugin-${slug}`;

/** The generated overlap map. Its absence is a build error, not an empty section. */
export function loadOxlintOverlap(): OxlintOverlap {
  const file = path.join(REPO_ROOT, 'docs/oxlint-builtin-overlap.json');
  return JSON.parse(readFileSync(file, 'utf8')) as OxlintOverlap;
}

/** The plugin's recommended rules as `{ id: severity }`, for oxlint configs. */
export function recommendedRules(slug: string): Record<string, string> {
  return Object.fromEntries(
    manifest.rules
      .filter((r) => r.prefix === slug && r.recommended && !r.deprecated)
      .map((r) => [r.id, String(r.recommended)]),
  );
}

/** Rule names in a plugin, from the synced manifest. */
export function pluginRules(slug: string): string[] {
  return manifest.rules.filter((r) => r.prefix === slug).map((r) => r.rule);
}

/** Every alias, with whether it is on npm yet (a private package is not). */
export function oxlintAliases() {
  return PLUGINS.map((p) => {
    const pkg = path.join(
      REPO_ROOT,
      'packages',
      oxlintAliasPackage(p.slug),
      'package.json',
    );
    const isPrivate = existsSync(pkg)
      ? (JSON.parse(readFileSync(pkg, 'utf8')) as { private?: boolean })
          .private === true
      : true;
    return { ...p, alias: oxlintAliasPackage(p.slug), published: !isPrivate };
  }).toSorted((a, b) => a.slug.localeCompare(b.slug));
}
