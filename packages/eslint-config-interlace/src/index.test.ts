/**
 * Lock tests for @interlace/eslint-config.
 *
 * The CLAUDE.md regression contract — "a fix isn't done until a test would
 * have caught the bug" — applies hard here: this package is the public
 * shareable surface for the whole ecosystem, and silent drift (a plugin
 * dropping its `flagship` preset, a new flagship rule not getting wired up,
 * a plugin renamed) would break thousands of downstream `extends` calls
 * without a visible compile error.
 *
 * Every preset has a structural lock that fails closed.
 */

import { describe, it, expect } from 'vitest';

import presets, { flagship, security, quality, react, componentApi, recommended } from './index';

import type { TSESLint } from '@interlace/eslint-devkit';

type FlatConfig = TSESLint.FlatConfig.Config;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const pluginKeysOf = (config: FlatConfig): readonly string[] =>
  Object.keys(config.plugins ?? {});

const allPluginKeysOf = (configs: readonly FlatConfig[]): readonly string[] =>
  configs.flatMap(pluginKeysOf);

const allRuleEntriesOf = (configs: readonly FlatConfig[]): readonly [string, unknown][] =>
  configs.flatMap((c) => Object.entries(c.rules ?? {}));

// ---------------------------------------------------------------------------
// Flagship — pinned to .agent/flagship-rules.md
// ---------------------------------------------------------------------------

describe('flagship preset', () => {
  // The canonical 10 rules from .agent/flagship-rules.md, all at error level.
  // Plugin keys are bare (no `@eslint/` or `@interlace/` scoping) — the
  // 2026-05-16 cleanup normalized the three drifted plugins (react-features,
  // maintainability, operability) and dropped the doubly-namespaced
  // `react/hooks-exhaustive-deps` form. Spec + code are now in lockstep.
  const EXPECTED_FLAGSHIP_RULES = [
    'import-next/no-cycle',
    'pg/no-unsafe-query',
    'secure-coding/no-hardcoded-credentials',
    'secure-coding/no-redos-vulnerable-regex',
    'mongodb-security/no-unsafe-query',
    'jwt/no-algorithm-none',
    'browser-security/no-postmessage-wildcard-origin',
    'react-features/hooks-exhaustive-deps',
    'react-a11y/alt-text',
    'vercel-ai-security/no-unsafe-output-handling',
  ] as const;

  const EXPECTED_FLAGSHIP_PLUGIN_KEYS = [
    'import-next',
    'pg',
    'secure-coding',
    'mongodb-security',
    'jwt',
    'browser-security',
    'react-features',
    'react-a11y',
    'vercel-ai-security',
  ] as const;

  it('is an array of 9 flat-config objects (one per flagship-hosting plugin)', () => {
    expect(Array.isArray(flagship)).toBe(true);
    expect(flagship).toHaveLength(9);
  });

  it('contains exactly the 10 rules in .agent/flagship-rules.md, all at "error"', () => {
    const entries = allRuleEntriesOf(flagship);

    // .agent/flagship-rules.md is the source of truth — every flagship rule
    // is error-level (criterion: "CI-gate shippable without recommended noise").
    for (const [, severity] of entries) {
      expect(severity).toBe('error');
    }

    const ruleNames = entries.map(([name]) => name).sort();
    expect(ruleNames).toEqual([...EXPECTED_FLAGSHIP_RULES].sort());
  });

  it('wires up exactly the 9 expected plugin keys (no missing, no extras)', () => {
    const keys = allPluginKeysOf(flagship).sort();
    expect(keys).toEqual([...EXPECTED_FLAGSHIP_PLUGIN_KEYS].sort());
  });

  it('every plugin entry is non-null (catches a plugin dropping its `flagship` export)', () => {
    for (const config of flagship) {
      expect(config).toBeDefined();
      expect(config.plugins).toBeDefined();
      for (const [key, value] of Object.entries(config.plugins ?? {})) {
        expect(value, `plugin "${key}" is null/undefined`).toBeTruthy();
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Security — every security plugin appears exactly once
// ---------------------------------------------------------------------------

describe('security preset', () => {
  const EXPECTED_SECURITY_PLUGINS = [
    'secure-coding',
    'node-security',
    'browser-security',
    'jwt',
    'pg',
    'mongodb-security',
    'express-security',
    'lambda-security',
    'nestjs-security',
    'vercel-ai-security',
  ] as const;

  it('composes recommended preset from all 10 security plugins', () => {
    const keys = allPluginKeysOf(security).sort();
    expect(keys).toEqual([...EXPECTED_SECURITY_PLUGINS].sort());
  });

  it('each entry actually carries rules (a plugin shipping an empty recommended preset is a bug)', () => {
    for (const config of security) {
      const ruleCount = Object.keys(config.rules ?? {}).length;
      expect(
        ruleCount,
        `plugin "${pluginKeysOf(config)[0]}" recommended has zero rules`,
      ).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Quality — every code-quality plugin appears exactly once
// ---------------------------------------------------------------------------

describe('quality preset', () => {
  const EXPECTED_QUALITY_PLUGINS = [
    'import-next',
    'conventions',
    'maintainability',
    'reliability',
    'operability',
    'modularity',
    'modernization',
  ] as const;

  it('composes recommended preset from all 7 quality plugins', () => {
    const keys = allPluginKeysOf(quality).sort();
    expect(keys).toEqual([...EXPECTED_QUALITY_PLUGINS].sort());
  });

  it('each entry actually carries rules', () => {
    for (const config of quality) {
      const ruleCount = Object.keys(config.rules ?? {}).length;
      expect(
        ruleCount,
        `plugin "${pluginKeysOf(config)[0]}" recommended has zero rules`,
      ).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// React — exactly the 2 React plugins
// ---------------------------------------------------------------------------

describe('react preset', () => {
  it('composes recommended preset from react-features and react-a11y', () => {
    const keys = allPluginKeysOf(react).sort();
    expect(keys).toEqual(['react-a11y', 'react-features']);
  });
});

// ---------------------------------------------------------------------------
// Recommended — the full default
// ---------------------------------------------------------------------------

describe('recommended preset', () => {
  it('is the concatenation of security + quality + react (19 plugins, no duplicates)', () => {
    expect(recommended).toHaveLength(security.length + quality.length + react.length);

    const keys = allPluginKeysOf(recommended);
    const unique = new Set(keys);
    expect(unique.size, 'a plugin appears twice in recommended').toBe(keys.length);
    expect(unique.size).toBe(19);
  });
});

// ---------------------------------------------------------------------------
// Component-API — opt-in for component-shipping packages
// ---------------------------------------------------------------------------

describe('componentApi preset', () => {
  // R5/R6/R8/R18/R19 from the `interlace-component` skill. Severities are
  // pinned: `no-default-test-id` is the only hard-fail (R5 — a runtime
  // default contradicts the type-level requirement); the rest are warnings
  // during migration. Drift here means consumer apps either start failing
  // unexpectedly or stop catching real violations.
  const EXPECTED_COMPONENT_API_RULES = {
    'react-features/component-api/no-default-test-id': 'error',
    'react-features/component-api/require-data-slot': 'warn',
    'react-features/component-api/no-is-prefix-prop': 'warn',
    'react-features/component-api/no-inline-style': 'warn',
    'react-features/component-api/no-raw-color-literal': 'warn',
    'react-features/component-api/no-arbitrary-token-class': 'warn',
    'react-features/component-api/no-kind-prop-discriminator': 'warn',
    'react-features/component-api/no-wrapper-sub-component': 'warn',
  } as const;

  it('is an array with the react-features plugin only', () => {
    expect(Array.isArray(componentApi)).toBe(true);
    expect(componentApi).toHaveLength(1);
    expect(pluginKeysOf(componentApi[0]!)).toEqual(['react-features']);
  });

  it('enables every component-api rule at its locked severity', () => {
    const entries = Object.fromEntries(allRuleEntriesOf(componentApi));
    expect(entries).toEqual(EXPECTED_COMPONENT_API_RULES);
  });

  it('is NOT included in `recommended` (opt-in for component-shipping packages only)', () => {
    const recommendedRules = new Set(allRuleEntriesOf(recommended).map(([k]) => k));
    for (const ruleId of Object.keys(EXPECTED_COMPONENT_API_RULES)) {
      expect(recommendedRules.has(ruleId)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Default export sanity
// ---------------------------------------------------------------------------

describe('default export', () => {
  it('exposes every named preset', () => {
    expect(presets.flagship).toBe(flagship);
    expect(presets.security).toBe(security);
    expect(presets.quality).toBe(quality);
    expect(presets.react).toBe(react);
    expect(presets.componentApi).toBe(componentApi);
    expect(presets.recommended).toBe(recommended);
  });
});
