/**
 * Lock: the published rule count must equal what the plugins actually export.
 *
 * `plugin-stats.json` feeds `interlace-numbers.json`, which is the single
 * source for every rule count on the docs site, the READMEs and the badges. It
 * is derived by *parsing* each plugin's `index.ts`, and that parse used to be a
 * regex run over the whole file:
 *
 *     content.match(/^\s+'[a-z-]+'\s*:/gm)
 *
 * which also matched `plugins: { 'mcp-sdk-security': plugin }` inside every
 * preset. Each plugin was over-counted by roughly one per config it ships —
 * 21 of 30 published plugins, 68 phantom rules, a published total overstated by
 * about 14%.
 *
 * Nothing caught it because nothing compared the parse to an independent
 * source. `.agent/oxlint-jsplugins-manifest.json` is one: the shim generator
 * builds it by `require()`-ing each plugin's built output and reading
 * `Object.keys(rules)`, so it counts what consumers can actually configure.
 *
 * This test is that comparison. It is the only thing standing between a parser
 * tweak and a wrong number on the storefront.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { countRuleKeys, rulesBlock } from '../../scripts/sync-plugin-stats';

const ROOT = join(__dirname, '../../../..');

interface PluginStat {
  name: string;
  rules: number;
  published: boolean;
}

interface OxlintPlugin {
  short: string;
  ruleCount: number;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as T;
}

describe('plugin rule counts', () => {
  const stats = readJson<PluginStat[] | { plugins: PluginStat[] }>(
    'apps/docs/src/data/plugin-stats.json',
  );
  const plugins: PluginStat[] = Array.isArray(stats) ? stats : stats.plugins;
  const oxlint = readJson<{ plugins: OxlintPlugin[] }>(
    '.agent/oxlint-jsplugins-manifest.json',
  );

  it('parses a non-empty catalog', () => {
    // A silently-empty read would make every assertion below vacuous.
    expect(plugins.length).toBeGreaterThan(20);
    expect(oxlint.plugins.length).toBeGreaterThan(20);
  });

  it('agrees with the oxlint runtime manifest for every published plugin', () => {
    const disagreements: string[] = [];
    for (const plugin of plugins) {
      const short = plugin.name.replace('eslint-plugin-', '');
      const runtime = oxlint.plugins.find((p) => p.short === short);
      if (runtime === undefined) continue;
      if (runtime.ruleCount !== plugin.rules) {
        disagreements.push(
          `${plugin.name}: plugin-stats says ${plugin.rules}, runtime exports ${runtime.ruleCount}`,
        );
      }
    }
    expect(
      disagreements,
      'plugin-stats.json disagrees with what the plugins export:\n' +
        disagreements.join('\n') +
        '\nRegenerate with `tsx apps/docs/scripts/sync-plugin-stats.ts`, and if the ' +
        'numbers still differ the parser in that script is wrong — not the manifest.',
    ).toEqual([]);
  });
});

describe('countRuleKeys', () => {
  it('counts a quoted rule map', () => {
    expect(countRuleKeys(`\n  'a-rule': aRule,\n  'b-rule': bRule,\n`)).toBe(2);
  });

  it('counts unquoted keys, which eslint-plugin-import-next uses', () => {
    // Matching only the quoted form undercounted that plugin by 7.
    expect(countRuleKeys(`\n  named: named,\n  default: defaultRule,\n`)).toBe(2);
  });

  it('counts an alias once, not twice', () => {
    // `order` is a second id for the same implementation. The oxlint generator
    // reports aliases separately from flat rules for the same reason.
    expect(
      countRuleKeys(`\n  'enforce-import-order': enforceImportOrder,\n  order: enforceImportOrder,\n`),
    ).toBe(1);
  });

  it('ignores keys nested inside an entry', () => {
    expect(countRuleKeys(`\n  'a-rule': makeRule({\n    inner: 1,\n    other: 2,\n  }),\n`)).toBe(1);
  });

  it('counts two rules built inline by the same factory as two', () => {
    // Deduplicating on the callee name would collapse these to one. Only a
    // *bare identifier* value can be an alias; a call is always its own rule.
    expect(
      countRuleKeys(`\n  'rule-a': makeRule({ foo: 1 }),\n  'rule-b': makeRule({ bar: 2 }),\n`),
    ).toBe(2);
  });

  it('still collapses an alias that carries a trailing comment', () => {
    // The one real alias in the ecosystem is written with one, and leaving the
    // comment attached made the value read as an expression rather than a bare
    // identifier — which silently turned the alias back into a second rule.
    expect(
      countRuleKeys(
        `\n  'enforce-import-order': enforceImportOrder,\n  order: enforceImportOrder, // Alias for backwards compat\n`,
      ),
    ).toBe(1);
  });

  it('counts nothing in an empty map', () => {
    expect(countRuleKeys('\n')).toBe(0);
  });
});

describe('rulesBlock', () => {
  it('extracts only the rules object, not the whole file', () => {
    const source = [
      "export const rules = {",
      "  'a-rule': aRule,",
      '};',
      'export const configs = {',
      "  strict: { plugins: { 'x-security': plugin } },",
      '};',
    ].join('\n');
    const block = rulesBlock(source);
    expect(block).toContain('a-rule');
    // The bug in one line: the config's plugin key must not be visible here.
    expect(block).not.toContain('x-security');
    expect(countRuleKeys(block!)).toBe(1);
  });

  it('brace-matches past a nested object rather than stopping at it', () => {
    const source = "export const rules = {\n  'a': makeRule({ x: 1 }),\n  'b': bRule,\n};\n";
    expect(countRuleKeys(rulesBlock(source)!)).toBe(2);
  });

  it('returns undefined when there is no rules export', () => {
    expect(rulesBlock('export const configs = {};')).toBeUndefined();
  });

  it('is not fooled by a similarly-named export declared first', () => {
    // Without a word boundary, `rulesHelper` matches and the real rule map is
    // never read — a confident wrong number rather than a visible failure.
    const source = [
      'export const rulesHelper = {',
      '  helper: 1,',
      '  other: 2,',
      '};',
      'export const rules = {',
      "  'a-rule': aRule,",
      '};',
    ].join('\n');
    expect(countRuleKeys(rulesBlock(source)!)).toBe(1);
  });

  it('handles an explicit type annotation on the rules export', () => {
    const source = "export const rules: Record<string, Rule> = {\n  'a-rule': aRule,\n};";
    expect(countRuleKeys(rulesBlock(source)!)).toBe(1);
  });
});
