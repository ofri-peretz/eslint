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
  noCodeInjectionInTool,
  noCommandInjectionInTool,
  noCredentialLeakInTool,
  noDuplicateToolName,
  noPathTraversalInTool,
  noPredictableSessionId,
  noSharedStatelessTransport,
  noSqlInjectionInTool,
  noSsrfInTool,
  noToolDescriptionInjection,
  noUntrustedStdioCommand,
  noUntrustedToolMetadataInPrompt,
  noUnvalidatedToolArgs,
  requireHttpTransportHardening,
  requireToolInputSchema,
} from './index';

/** Every rule id, in order, with the module it must be wired to. */
const WIRING = {
  'no-code-injection-in-tool': noCodeInjectionInTool,
  'no-command-injection-in-tool': noCommandInjectionInTool,
  'no-credential-leak-in-tool': noCredentialLeakInTool,
  'no-duplicate-tool-name': noDuplicateToolName,
  'no-path-traversal-in-tool': noPathTraversalInTool,
  'no-predictable-session-id': noPredictableSessionId,
  'no-shared-stateless-transport': noSharedStatelessTransport,
  'no-sql-injection-in-tool': noSqlInjectionInTool,
  'no-ssrf-in-tool': noSsrfInTool,
  'no-tool-description-injection': noToolDescriptionInjection,
  'no-untrusted-stdio-command': noUntrustedStdioCommand,
  'no-untrusted-tool-metadata-in-prompt': noUntrustedToolMetadataInPrompt,
  'no-unvalidated-tool-args': noUnvalidatedToolArgs,
  'require-http-transport-hardening': requireHttpTransportHardening,
  'require-tool-input-schema': requireToolInputSchema,
} as const;

describe('eslint-plugin-mcp-sdk-security', () => {
  it('exposes every rule under its documented id', () => {
    expect(Object.keys(rules).sort()).toEqual(Object.keys(WIRING));
    // Reference equality, not just presence: a rule id can be wired to the
    // wrong module and every id-based assertion still passes.
    for (const [id, rule] of Object.entries(WIRING))
      expect(rules[id]).toBe(rule);
  });

  it('names itself for the oxlint loader', () => {
    expect(namedPlugin.meta?.name).toBe('eslint-plugin-mcp-sdk-security');
    expect(namedPlugin.rules).toBe(rules);
  });

  it('ships minimal, recommended and strict configs', () => {
    expect(Object.keys(configs).sort()).toEqual([
      'minimal',
      'recommended',
      'strict',
    ]);
  });

  it('enables the rule under the mcp-sdk-security namespace in every config', () => {
    for (const config of Object.values(configs)) {
      expect(config.plugins).toHaveProperty('mcp-sdk-security');
      expect(config.rules?.['mcp-sdk-security/require-tool-input-schema']).toBe(
        'error',
      );
    }
  });

  it('turns every rule on in strict, by name, at its recommended level', () => {
    // Derived from `rules`, so this fails the moment a rule is added to the
    // plugin and not to the preset. A count comparison would not: it passes if
    // strict drops one rule and picks up any other mcp-sdk-security key.
    const strictRules = configs.strict.rules ?? {};
    const recommended = configs.recommended.rules ?? {};
    for (const ruleName of Object.keys(rules)) {
      const id = `mcp-sdk-security/${ruleName}`;
      expect(strictRules[id]).toBe(recommended[id] ?? 'error');
    }
    expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
  });

  it('sets each rule to error at CVSS 7.0 and above, warn below (new rules)', () => {
    // The 2026-10 missing-detections rules follow the plugin's severity
    // policy; require-tool-input-schema (5.3) predates it and stays in minimal.
    const recommended = configs.recommended.rules ?? {};
    for (const [ruleName, rule] of Object.entries(rules)) {
      if (ruleName === 'require-tool-input-schema') continue;
      const cvss = (rule.meta.docs as { cvss: number }).cvss;
      expect(recommended[`mcp-sdk-security/${ruleName}`], ruleName).toBe(
        cvss >= 7 ? 'error' : 'warn',
      );
    }
  });

  it('keeps no-tool-description-injection out of minimal', () => {
    // In recommended since the zero-deferral pass. Since the 2026-10-11
    // real-code scan it reports only text followed back to a client, a remote
    // service or a file's contents (benchmarks/audits/2026-10-10-fp-fn-mcp-sdk-security.md).
    // It stays out of minimal until that narrowed rule has a measured
    // false-positive profile of its own.
    expect(
      configs.minimal.rules?.['mcp-sdk-security/no-tool-description-injection'],
    ).toBeUndefined();
  });

  it('pins the exact rule set of every preset', () => {
    const ids = (preset: keyof typeof configs) =>
      Object.keys(configs[preset].rules ?? {}).sort();
    expect(ids('minimal')).toEqual([
      'mcp-sdk-security/no-command-injection-in-tool',
      'mcp-sdk-security/require-tool-input-schema',
    ]);
    expect(ids('recommended')).toEqual(
      Object.keys(WIRING).map((id) => `mcp-sdk-security/${id}`),
    );
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

    it('the rules table marks ⚠️ on exactly the rules recommended at warn', () => {
      const table = readme.slice(
        readme.indexOf('<!-- AUTO-GENERATED:RULES_TABLE:START'),
        readme.indexOf('<!-- AUTO-GENERATED:RULES_TABLE:END'),
      );
      const warned = table
        .split('\n')
        .filter(
          (line) =>
            line.startsWith('| [') && line.split('|')[8]!.includes('⚠️'),
        )
        .map((row) => /^\| \[([a-z0-9-]+)\]/.exec(row)![1])
        .sort();
      const atWarn = Object.entries(configs.recommended.rules ?? {})
        .filter(([, level]) => level === 'warn')
        .map(([id]) => id.replace('mcp-sdk-security/', ''))
        .sort();
      expect(warned).toEqual(atWarn);
    });

    it('the rules table marks 💼 on exactly the rules recommended at error', () => {
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
      // A rule recommended at `warn` carries ⚠️ instead (asserted above).
      const atError = Object.entries(configs.recommended.rules ?? {})
        .filter(([, level]) => level === 'error')
        .map(([id]) => id.replace('mcp-sdk-security/', ''))
        .sort();
      expect(marked).toEqual(atError);
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
