/**
 * @fileoverview Plugin surface lock for eslint-plugin-mcp-sdk-security.
 *
 * Guards the contract consumers actually wire up: the rule map, the plugin
 * object oxlint loads, and the three shipped configs.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import plugin, {
  rules,
  configs,
  plugin as namedPlugin,
  noCommandInjectionInTool,
  noToolDescriptionInjection,
  noUnvalidatedToolArgs,
  requireToolInputSchema,
} from './index';

describe('eslint-plugin-mcp-sdk-security', () => {
  it('exposes every rule under its documented id', () => {
    expect(Object.keys(rules).sort()).toEqual([
      'no-command-injection-in-tool',
      'no-tool-description-injection',
      'no-unvalidated-tool-args',
      'require-tool-input-schema',
    ]);
    // Reference equality, not just presence: a rule id can be wired to the
    // wrong module and every id-based assertion still passes.
    expect(rules['require-tool-input-schema']).toBe(requireToolInputSchema);
    expect(rules['no-unvalidated-tool-args']).toBe(noUnvalidatedToolArgs);
    expect(rules['no-tool-description-injection']).toBe(noToolDescriptionInjection);
    expect(rules['no-command-injection-in-tool']).toBe(noCommandInjectionInTool);
  });

  it('names itself for the oxlint loader', () => {
    expect(namedPlugin.meta?.name).toBe('eslint-plugin-mcp-sdk-security');
    expect(namedPlugin.rules).toBe(rules);
  });

  it('ships minimal, recommended and strict configs', () => {
    expect(Object.keys(configs).sort()).toEqual(['minimal', 'recommended', 'strict']);
  });

  it('enables the rule under the mcp-sdk-security namespace in every config', () => {
    for (const config of Object.values(configs)) {
      expect(config.plugins).toHaveProperty('mcp-sdk-security');
      expect(config.rules?.['mcp-sdk-security/require-tool-input-schema']).toBe('error');
    }
  });

  it('turns every rule on in strict, by name', () => {
    // Derived from `rules`, so this fails the moment a rule is added to the
    // plugin and not to the preset. A count comparison would not: it passes if
    // strict drops one rule and picks up any other mcp-sdk-security key.
    const strictRules = configs.strict.rules ?? {};
    for (const ruleName of Object.keys(rules)) {
      expect(strictRules[`mcp-sdk-security/${ruleName}`]).toBe('error');
    }
    expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
  });

  it('keeps no-tool-description-injection out of minimal', () => {
    // Promoted to recommended after the zero-deferral pass: it now resolves
    // consts and relative imports and reports only text it can show is
    // dynamic (benchmarks/audits/2026-10-10-fp-fn-mcp-sdk-security.md). It
    // still reports a description returned by a call, which minimal — "every
    // finding is a defect by construction" — does not accept.
    expect(configs.minimal.rules?.['mcp-sdk-security/no-tool-description-injection']).toBeUndefined();
  });

  it('pins the exact rule set of every preset', () => {
    const ids = (preset: keyof typeof configs) =>
      Object.keys(configs[preset].rules ?? {}).sort();
    expect(ids('minimal')).toEqual([
      'mcp-sdk-security/no-command-injection-in-tool',
      'mcp-sdk-security/require-tool-input-schema',
    ]);
    expect(ids('recommended')).toEqual([
      'mcp-sdk-security/no-command-injection-in-tool',
      'mcp-sdk-security/no-tool-description-injection',
      'mcp-sdk-security/no-unvalidated-tool-args',
      'mcp-sdk-security/require-tool-input-schema',
    ]);
  });

  /**
   * README ↔ config lock. The README once said `recommended` "Enables every
   * rule at `error`" while it shipped one rule — so a user following the
   * README got neither what it promised nor the CWE-78 coverage. Both README
   * surfaces that describe the presets are parsed and compared to `configs`.
   */
  describe('README agrees with the shipped presets', () => {
    const readme = readFileSync(join(__dirname, '..', 'README.md'), 'utf8');
    const ruleNames = (cell: string) =>
      [...cell.matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]).sort();
    const configured = (preset: keyof typeof configs) =>
      Object.keys(configs[preset].rules ?? {})
        .map((id) => id.replace('mcp-sdk-security/', ''))
        .sort();

    it.each(['minimal', 'recommended', 'strict'] as const)(
      'the preset table lists exactly the %s rules',
      (preset) => {
        const row = readme
          .split('\n')
          .find((line) => line.startsWith(`| \`${preset}\` |`));
        expect(row, `no README preset row for ${preset}`).toBeDefined();
        const rulesCell = row!.split('|')[2]!;
        expect(ruleNames(rulesCell)).toEqual(configured(preset));
      },
    );

    it('the rules table marks 💼 on exactly the recommended rules', () => {
      const table = readme.slice(
        readme.indexOf('<!-- AUTO-GENERATED:RULES_TABLE:START'),
        readme.indexOf('<!-- AUTO-GENERATED:RULES_TABLE:END'),
      );
      const rows = table.split('\n').filter((line) => line.startsWith('| ['));
      expect(rows).toHaveLength(Object.keys(rules).length);
      const marked = rows
        .filter((row) => row.split('|')[7]!.includes('💼'))
        .map((row) => /^\| \[([a-z0-9-]+)\]/.exec(row)![1])
        .sort();
      expect(marked).toEqual(configured('recommended'));
    });

    it('does not claim recommended enables every rule', () => {
      expect(readme).not.toMatch(/Enables every rule/);
    });
  });

  it('default-exports the plugin with its configs attached', () => {
    expect(plugin.rules).toBe(rules);
    expect(plugin.configs).toBe(configs);
  });
});
