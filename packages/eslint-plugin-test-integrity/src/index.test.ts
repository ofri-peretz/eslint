/**
 * @fileoverview Plugin surface lock for eslint-plugin-test-integrity.
 *
 * Guards what consumers wire up: the rule map, the plugin object oxlint loads,
 * and the two presets — `recommended` (errors) and `adoption` (warnings), each
 * derived from the rule map so a new rule cannot be left out of either.
 */

import { describe, expect, it } from 'vitest';

import plugin, {
  configs,
  noFixedSleep,
  noFocusedTest,
  noTestRetry,
  noUnexplainedSkip,
  plugin as namedPlugin,
  rules,
} from './index';

describe('eslint-plugin-test-integrity', () => {
  it('exposes every rule under its documented id', () => {
    expect(Object.keys(rules).sort()).toEqual([
      'no-fixed-sleep',
      'no-focused-test',
      'no-test-retry',
      'no-unexplained-skip',
    ]);
    expect(rules['no-fixed-sleep']).toBe(noFixedSleep);
    expect(rules['no-focused-test']).toBe(noFocusedTest);
    expect(rules['no-test-retry']).toBe(noTestRetry);
    expect(rules['no-unexplained-skip']).toBe(noUnexplainedSkip);
  });

  it('names itself for the oxlint loader', () => {
    expect(namedPlugin.meta?.name).toBe('eslint-plugin-test-integrity');
    expect(namedPlugin.rules).toBe(rules);
  });

  it('turns every rule on in recommended as an error and in adoption as a warning', () => {
    expect(Object.keys(configs).sort()).toEqual(['adoption', 'recommended']);
    for (const [name, severity] of [
      ['recommended', 'error'],
      ['adoption', 'warn'],
    ] as const) {
      const config = configs[name];
      expect(config.plugins).toHaveProperty('test-integrity');
      const configured = config.rules ?? {};
      expect(Object.keys(configured).length).toBe(Object.keys(rules).length);
      for (const ruleName of Object.keys(rules)) {
        expect(configured[`test-integrity/${ruleName}`]).toBe(severity);
      }
    }
  });

  it('default-exports the plugin with its configs attached', () => {
    expect(plugin.rules).toBe(rules);
    expect(plugin.configs).toBe(configs);
  });

  it('stamps a canonical docs URL on every rule', () => {
    for (const [name, rule] of Object.entries(rules)) {
      expect(rule.meta.docs?.url).toBe(
        `https://eslint.interlace.tools/docs/quality/plugin-test-integrity/rules/${name}`,
      );
    }
  });
});
