/**
 * Plugin-name drift — eslint variant.
 *
 * Asserts that every `eslint-plugin-*` / `eslint-config-*` reference in
 * `content/docs/**.mdx` resolves to a package in the canonical registry
 * at `src/lib/plugins.ts`. Catches the failure mode this whole Wave 8
 * cleanup was prompted by — phantom packages (`eslint-config-interlace`,
 * `eslint-plugin-secrets`, `eslint-plugin-react-best-practices`,
 * `eslint-plugin-react-hooks-best-practices`, `eslint-plugin-documentation`)
 * staying referenced in docs long after they were renamed or removed.
 *
 * Allowlisted: third-party / community packages legitimately mentioned in
 * troubleshooting + how-to prose (e.g. `eslint-plugin-react`,
 * `eslint-config-prettier`, `eslint-config-next`).
 */

import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { validatePluginNameDrift } from '#interlace/validators/plugin-name-drift';
import { PLUGIN_PACKAGES } from '../lib/plugins';

const ALLOWED_THIRD_PARTY = [
  // === Community configs/plugins legitimately mentioned in prose ===
  'eslint-config-prettier',
  'eslint-config-next',
  'eslint-config-airbnb',
  'eslint-config-standard',
  'eslint-plugin-react',
  'eslint-plugin-react-hooks',
  'eslint-plugin-import',
  'eslint-plugin-jsx-a11y',
  'eslint-plugin-prettier',
  'eslint-plugin-security',
  'eslint-plugin-no-secrets',
  'eslint-plugin-sonarjs',
  'eslint-plugin-unicorn',
  'eslint-plugin-n',
  'eslint-plugin-node',
  'eslint-plugin-promise',
  'eslint-plugin-no-console',
  'eslint-plugin-deprecation',
  'eslint-plugin-naming-convention',
  'eslint-plugin-complexity',
  // Mentioned in ecosystem.mdx (the per-plugin landscape page).
  // These are third-party plugins we describe as neighbors in the
  // landscape — adding them so the doc can cite the real package
  // names without tripping the canonical-registry guard.
  'eslint-plugin-no-unsanitized',
  'eslint-plugin-nestjs',
  'eslint-plugin-perfectionist',
  'eslint-plugin-unused-imports',
  'eslint-plugin-simple-import-sort',
  // Cited in design/docs.mdx (projected from DOCS_PHILOSOPHY.md) as the
  // upstream meta-plugin our rule-authoring tooling neighbours.
  'eslint-plugin-eslint-plugin',

  // === Documentation placeholders ===
  // `eslint-config-mycompany` is the "your shared config" example in
  // `getting-started/configuration.mdx`. Not a real package.
  'eslint-config-mycompany',
] as const;

describe('plugin-name drift (eslint content/docs)', () => {
  it('every eslint-plugin-* / eslint-config-* reference is canonical or allowlisted', async () => {
    const findings = await validatePluginNameDrift({
      contentRoot: resolve(__dirname, '..', '..', 'content', 'docs'),
      canonicalPackages: PLUGIN_PACKAGES,
      allowedPackages: ALLOWED_THIRD_PARTY,
    });

    if (findings.length > 0) {
      console.error('Plugin name drift findings:', findings);
    }

    expect(findings).toEqual([]);
  });
});
