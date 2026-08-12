/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Rules whose findings describe the *corpus checkout* rather than the code.
 *
 * A cloned repository has no `node_modules`, so every rule that resolves a
 * module specifier reports on every third-party import in the project. In the
 * first run of this bench `import-next/no-unresolved` alone produced **26,487
 * of import-next's 30,694 findings** — a number that says nothing about the
 * preset and everything about the fact that nobody ran `npm install`. Excluding
 * them took that plugin's median from 440 findings per repository to 90.
 *
 * Installing dependencies for 107 repositories is not viable — minutes each,
 * network, lockfile drift, and postinstall scripts from third-party
 * repositories that we would be executing. So these are excluded and the
 * exclusion is *reported*, never folded in silently: a budget that quietly
 * counts harness artefacts is the same defect as a gate that quietly compares
 * two different corpora.
 */
export const RESOLUTION_DEPENDENT: ReadonlySet<string> = new Set([
  'import-next/no-unresolved',
  'import-next/no-extraneous-dependencies',
  'import-next/no-deprecated',
  'import-next/no-relative-packages',
  'import-next/no-cycle',
  'import-next/named',
  'import-next/namespace',
  'import-next/default',
  'import-next/export',
  'import-next/no-named-as-default',
  'import-next/no-named-as-default-member',
  'import-next/no-unused-modules',
]);

/**
 * The rules a plugin's `recommended` turns on.
 *
 * Flat config exposes one object; the legacy shape is an array of blocks whose
 * `rules` merge in order. Both are read rather than assumed, because a preset
 * this bench cannot parse would silently score zero — a plugin that looks
 * perfectly quiet because nothing was ever enabled.
 */
export function recommendedRules(configs: unknown): Record<string, unknown> {
  const rec = (configs as Record<string, unknown> | undefined)?.['recommended'];
  if (rec === undefined || rec === null) return {};
  if (Array.isArray(rec)) {
    return Object.assign(
      {},
      ...rec.map((c: { rules?: Record<string, unknown> }) => c.rules ?? {}),
    ) as Record<string, unknown>;
  }
  return (rec as { rules?: Record<string, unknown> }).rules ?? {};
}

/**
 * Nearest-rank percentile over an ascending array.
 *
 * The median is the headline because the mean is worthless here: one 41,000
 * finding monorepo would drag a plugin's average past every other repository it
 * is quiet on, and describe no user's experience at all.
 */
export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}
