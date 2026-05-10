/**
 * Canonical plugin registry — single source of truth for which plugins exist
 * in this monorepo and how the docs site refers to them.
 *
 * **Why this file exists.** Before 2026-05, three places (sync-rules-docs,
 * api/changelog route, api/stats route) each maintained their own plugin
 * list. The lists drifted: phantom packages (`eslint-config-interlace`,
 * `eslint-plugin-secrets`, `eslint-plugin-react-best-practices`,
 * `eslint-plugin-react-hooks-best-practices`, `eslint-plugin-documentation`)
 * stayed in maps long after the actual packages were renamed or removed.
 * Real packages (`react-a11y`, `lambda-security`, …) were missing entirely.
 *
 * **The contract.** Every consumer (script, API route, MDX content) imports
 * from this file. The `validatePluginNameDrift` validator (in the baseline)
 * fails CI if any content/* hardcodes a plugin name absent from `PLUGINS`.
 *
 * Adding a plugin:
 *   1. Append a row to `PLUGINS` below.
 *   2. Confirm the package directory exists at `packages/<package>/`.
 *   3. Run `npm run sync-rules` to generate the rule MDX shells.
 *   4. The plugin's sidebar entry appears automatically.
 *
 * Removing/renaming a plugin: delete or rename the row here; CI's drift
 * validator will catch every doc that still references the old name.
 */

export type Pillar = 'security' | 'quality';

export interface PluginEntry {
  /** Sidebar slug — used in URLs (`/docs/<pillar>/plugin-<slug>/...`) */
  slug: string;
  /** npm package name */
  package: string;
  /** Which sidebar pillar the plugin lives under */
  pillar: Pillar;
  /** One-line description used in indexes (changelog page, registry, etc.) */
  description: string;
}

/**
 * Canonical 20-plugin registry. Order doesn't matter for correctness; alphabetical
 * within each pillar keeps the changelog tables and registries deterministic.
 */
export const PLUGINS: PluginEntry[] = [
  // === Security pillar (11) ===
  {
    slug: 'browser-security',
    package: 'eslint-plugin-browser-security',
    pillar: 'security',
    description: 'XSS, DOM security',
  },
  {
    slug: 'crypto',
    package: 'eslint-plugin-crypto',
    pillar: 'security',
    description: 'Weak algorithms, PRNG',
  },
  {
    slug: 'express-security',
    package: 'eslint-plugin-express-security',
    pillar: 'security',
    description: 'Express middleware hardening',
  },
  {
    slug: 'jwt',
    package: 'eslint-plugin-jwt',
    pillar: 'security',
    description: 'Token security',
  },
  {
    slug: 'lambda-security',
    package: 'eslint-plugin-lambda-security',
    pillar: 'security',
    description: 'AWS Lambda hardening',
  },
  {
    slug: 'mongodb-security',
    package: 'eslint-plugin-mongodb-security',
    pillar: 'security',
    description: 'MongoDB injection',
  },
  {
    slug: 'nestjs-security',
    package: 'eslint-plugin-nestjs-security',
    pillar: 'security',
    description: 'NestJS framework hardening',
  },
  {
    slug: 'node-security',
    package: 'eslint-plugin-node-security',
    pillar: 'security',
    description: 'Server-side patterns',
  },
  {
    slug: 'pg',
    package: 'eslint-plugin-pg',
    pillar: 'security',
    description: 'PostgreSQL security',
  },
  {
    slug: 'secure-coding',
    package: 'eslint-plugin-secure-coding',
    pillar: 'security',
    description: 'Injection prevention',
  },
  {
    slug: 'vercel-ai-security',
    package: 'eslint-plugin-vercel-ai-security',
    pillar: 'security',
    description: 'AI SDK security',
  },
  // === Quality pillar (9) ===
  {
    slug: 'conventions',
    package: 'eslint-plugin-conventions',
    pillar: 'quality',
    description: 'Team-specific habits and styles',
  },
  {
    slug: 'import-next',
    package: 'eslint-plugin-import-next',
    pillar: 'quality',
    description: 'Fast cycle + import-graph analysis',
  },
  {
    slug: 'maintainability',
    package: 'eslint-plugin-maintainability',
    pillar: 'quality',
    description: 'Cognitive load and clean-code patterns',
  },
  {
    slug: 'modernization',
    package: 'eslint-plugin-modernization',
    pillar: 'quality',
    description: 'ESNext migration + syntax evolution',
  },
  {
    slug: 'modularity',
    package: 'eslint-plugin-modularity',
    pillar: 'quality',
    description: 'Structural integrity and DDD patterns',
  },
  {
    slug: 'operability',
    package: 'eslint-plugin-operability',
    pillar: 'quality',
    description: 'Production readiness and resource health',
  },
  {
    slug: 'react-a11y',
    package: 'eslint-plugin-react-a11y',
    pillar: 'quality',
    description: 'React accessibility / WCAG',
  },
  {
    slug: 'react-features',
    package: 'eslint-plugin-react-features',
    pillar: 'quality',
    description: 'React best practices and optimization',
  },
  {
    slug: 'reliability',
    package: 'eslint-plugin-reliability',
    pillar: 'quality',
    description: 'Runtime stability and error safety',
  },
];

/** Convenience: lookup by slug. */
export const PLUGINS_BY_SLUG: Record<string, PluginEntry> = Object.fromEntries(
  PLUGINS.map((p) => [p.slug, p]),
);

/** Convenience: lookup by package name. */
export const PLUGINS_BY_PACKAGE: Record<string, PluginEntry> = Object.fromEntries(
  PLUGINS.map((p) => [p.package, p]),
);

/** All canonical plugin slugs (sorted). */
export const PLUGIN_SLUGS: readonly string[] = PLUGINS.map((p) => p.slug).sort();

/** All canonical package names (sorted). */
export const PLUGIN_PACKAGES: readonly string[] = PLUGINS.map((p) => p.package).sort();

/**
 * Plugins under a given pillar.
 */
export function pluginsByPillar(pillar: Pillar): PluginEntry[] {
  return PLUGINS.filter((p) => p.pillar === pillar);
}
