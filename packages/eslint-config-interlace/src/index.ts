/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @interlace/eslint-config — REPO-INTERNAL, NOT PUBLISHED
 *
 * `private: true`. This is not a consumer-facing meta-config and must not be
 * recommended or published: ESLint config is composed per repository from the
 * individual `eslint-plugin-*` packages, so each repo takes only what it needs.
 *
 * It exists so this monorepo can lint its own component API (`componentApi`,
 * consumed by the root `eslint.config.mjs`) and so `src/index.test.ts` can pin
 * the flagship array against `.agent/flagship-rules.md`.
 *
 * Presets (all are flat-config arrays — drop them into ESLint 9/10 with
 * spread, e.g. `export default [...flagship, ...myOverrides]`):
 *
 *   - `flagship`     — the 10 flagship rules from 9 plugins
 *   - `security`     — recommended preset of every security plugin (10)
 *   - `quality`      — recommended preset of every code-quality plugin (7)
 *   - `react`        — recommended preset of `react-features` + `react-a11y`
 *   - `recommended`  — security + quality + react (full default, 19 plugins)
 *
 * See README.md for usage.
 */

import { configs as importNextConfigs } from 'eslint-plugin-import-next';
// pg / jwt were renamed to the -security names and the old npm packages are
// deprecated. The shipped config must not install a deprecated dependency, so
// it points at the new names; the rule namespaces (`pg/`, `jwt/`) are unchanged,
// which is why nothing downstream of these imports had to move.
import { configs as pgConfigs } from 'eslint-plugin-postgresql-security';
import { configs as secureCodingConfigs } from 'eslint-plugin-secure-coding';
import { configs as mongoConfigs } from 'eslint-plugin-mongodb-security';
import { configs as jwtConfigs } from 'eslint-plugin-jwt-security';
import { configs as browserConfigs } from 'eslint-plugin-browser-security';
import { configs as reactFeaturesConfigs } from 'eslint-plugin-react-features';
import { configs as reactA11yConfigs } from 'eslint-plugin-react-a11y';
import { configs as vercelAiConfigs } from 'eslint-plugin-vercel-ai-security';
import { configs as nodeSecurityConfigs } from 'eslint-plugin-node-security';
import { configs as expressConfigs } from 'eslint-plugin-express-security';
import { configs as lambdaConfigs } from 'eslint-plugin-lambda-security';
import { configs as nestjsConfigs } from 'eslint-plugin-nestjs-security';
import { configs as conventionsConfigs } from 'eslint-plugin-conventions';
import { configs as maintainabilityConfigs } from 'eslint-plugin-maintainability';
import { configs as reliabilityConfigs } from 'eslint-plugin-reliability';
import { configs as operabilityConfigs } from 'eslint-plugin-operability';
import { configs as modularityConfigs } from 'eslint-plugin-modularity';
import { configs as modernizationConfigs } from 'eslint-plugin-modernization';

import type { TSESLint } from '@interlace/eslint-devkit';

type FlatConfig = TSESLint.FlatConfig.Config;
type ConfigMap = Readonly<Record<string, FlatConfig>>;

/**
 * The 10 flagship rules in `.agent/flagship-rules.md`, one preset per plugin.
 * Order matches the spec table; spreading produces deterministic output.
 *
 * Each entry is a single flat-config object — wrap or spread as needed
 * depending on whether you compose with `[...flagship, ...rest]` or with
 * an array literal `[flagship[0], myOverride, flagship[1], ...]`.
 */
export const flagship: readonly FlatConfig[] = [
  (importNextConfigs as ConfigMap)['flagship']!,
  (pgConfigs as ConfigMap)['flagship']!,
  (secureCodingConfigs as ConfigMap)['flagship']!,
  (mongoConfigs as ConfigMap)['flagship']!,
  (jwtConfigs as ConfigMap)['flagship']!,
  (browserConfigs as ConfigMap)['flagship']!,
  (reactFeaturesConfigs as ConfigMap)['flagship']!,
  (reactA11yConfigs as ConfigMap)['flagship']!,
  (vercelAiConfigs as ConfigMap)['flagship']!,
];

/**
 * Recommended preset for every security plugin. 10 plugins.
 */
export const security: readonly FlatConfig[] = [
  (secureCodingConfigs as ConfigMap)['recommended']!,
  (nodeSecurityConfigs as ConfigMap)['recommended']!,
  (browserConfigs as ConfigMap)['recommended']!,
  (jwtConfigs as ConfigMap)['recommended']!,
  (pgConfigs as ConfigMap)['recommended']!,
  (mongoConfigs as ConfigMap)['recommended']!,
  (expressConfigs as ConfigMap)['recommended']!,
  (lambdaConfigs as ConfigMap)['recommended']!,
  (nestjsConfigs as ConfigMap)['recommended']!,
  (vercelAiConfigs as ConfigMap)['recommended']!,
];

/**
 * Recommended preset for every code-quality plugin. 7 plugins.
 */
export const quality: readonly FlatConfig[] = [
  (importNextConfigs as ConfigMap)['recommended']!,
  (conventionsConfigs as ConfigMap)['recommended']!,
  (maintainabilityConfigs as ConfigMap)['recommended']!,
  (reliabilityConfigs as ConfigMap)['recommended']!,
  (operabilityConfigs as ConfigMap)['recommended']!,
  (modularityConfigs as ConfigMap)['recommended']!,
  (modernizationConfigs as ConfigMap)['recommended']!,
];

/**
 * Recommended preset for the React plugins. 2 plugins.
 *
 * Apply only to JSX/TSX files.
 */
export const react: readonly FlatConfig[] = [
  (reactFeaturesConfigs as ConfigMap)['recommended']!,
  (reactA11yConfigs as ConfigMap)['recommended']!,
];

/**
 * Component-API preset — the mechanical R5/R6/R8/R18/R19 rules from the
 * `interlace-component` skill. Opt-in: apply to packages that ship shared
 * React components (design-system, `@interlace/ui`, marketing surfaces).
 * Not included in `recommended` because the rules are too strict for
 * application code that hasn't been migrated yet.
 *
 *
 * This is the one preset with a live internal consumer: the root
 * `eslint.config.mjs` imports it, and `.github/workflows/component-api-lint.yml`
 * builds this package to run it.
 */
export const componentApi: readonly FlatConfig[] = [
  (reactFeaturesConfigs as ConfigMap)['componentApi']!,
];

/**
 * Full preset — security + quality + react. 19 plugins.
 *
 * Internal aggregate only; it is not offered to consumers as a one-import
 * install. It backs the structural lock that fails closed when a plugin drops
 * its `recommended` export.
 */
export const recommended: readonly FlatConfig[] = [
  ...security,
  ...quality,
  ...react,
];

/**
 * Default export aggregates every named preset under one namespace for the
 * repo-internal callers and the lock test.
 */
const presets = {
  flagship,
  security,
  quality,
  react,
  componentApi,
  recommended,
} as const;

export default presets;
