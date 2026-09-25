/**
 * @fileoverview Plugin surface lock for eslint-plugin-cli-floor.
 *
 * Guards the contract consumers actually wire up: the rule map, the plugin
 * object oxlint loads, and the two shipped configs — including the decision
 * that `no-prompt-without-flag` is `strict` only.
 */

import { describe, it, expect } from 'vitest';

import plugin, {
  configs,
  noConsoleInCommand,
  noPromptWithoutFlag,
  plugin as namedPlugin,
  requireCommandDescription,
  requireCommandExample,
  rules,
} from './index';

describe('eslint-plugin-cli-floor', () => {
  it('exposes every rule under its documented id', () => {
    expect(Object.keys(rules).sort()).toEqual([
      'no-console-in-command',
      'no-prompt-without-flag',
      'require-command-description',
      'require-command-example',
    ]);
    // Reference equality, not just presence: a rule id can be wired to the
    // wrong module and every id-based assertion still passes.
    expect(rules['no-console-in-command']).toBe(noConsoleInCommand);
    expect(rules['no-prompt-without-flag']).toBe(noPromptWithoutFlag);
    expect(rules['require-command-description']).toBe(
      requireCommandDescription,
    );
    expect(rules['require-command-example']).toBe(requireCommandExample);
  });

  it('names itself for the oxlint loader', () => {
    expect(namedPlugin.meta?.name).toBe('eslint-plugin-cli-floor');
    expect(namedPlugin.rules).toBe(rules);
  });

  it('ships recommended and strict configs under the cli-floor namespace', () => {
    expect(Object.keys(configs).sort()).toEqual(['recommended', 'strict']);
    for (const config of Object.values(configs)) {
      expect(config.plugins).toHaveProperty('cli-floor');
    }
  });

  it('turns every rule on in strict, by name', () => {
    const strictRules = configs.strict.rules ?? {};
    for (const ruleName of Object.keys(rules)) {
      expect(strictRules[`cli-floor/${ruleName}`]).toBe('error');
    }
    expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
  });

  it('keeps no-prompt-without-flag out of recommended until its precision is measured', () => {
    // burgee's intent for this plugin: `strict` only until a precision study on
    // ten real CLIs shows fewer than one false positive per hundred prompts.
    // This lock makes "not yet promoted" a decision on the record.
    const recommended = configs.recommended.rules ?? {};
    expect(recommended['cli-floor/no-prompt-without-flag']).toBeUndefined();
    expect(Object.keys(recommended).sort()).toEqual([
      'cli-floor/no-console-in-command',
      'cli-floor/require-command-description',
      'cli-floor/require-command-example',
    ]);
  });

  it('default-exports the plugin with its configs attached', () => {
    expect(plugin.rules).toBe(rules);
    expect(plugin.configs).toBe(configs);
  });

  it('stamps a canonical docs URL on every rule', () => {
    for (const [name, rule] of Object.entries(rules)) {
      expect(rule.meta.docs?.url).toBe(
        `https://eslint.interlace.tools/docs/quality/plugin-cli-floor/rules/${name}`,
      );
    }
  });
});
