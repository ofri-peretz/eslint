/**
 * Unit tests for the root-level rules-table generator at
 * `scripts/sync-readme-rules.ts`. The generator is the single source of truth
 * for README rule tables across all 20 plugins — these tests lock the
 * behaviors that regressed in 2026-05 (eating adjacent markdown tables,
 * dropping rules silently, non-idempotent output).
 */

import { describe, expect, it } from 'vitest';
import {
  spliceTable,
  renderRulesTable,
  loadPluginRegistry,
  loadTypeAwarenessMap,
  type RuleMeta,
} from '../../../../scripts/sync-readme-rules';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..', '..', '..');

const SAMPLE_RULE: RuleMeta = {
  name: 'no-silent-errors',
  description: 'Disallow empty catch blocks',
  cwe: '',
  owasp: '',
  cvss: '',
  recommended: true,
  warns: false,
  fixable: false,
  suggestions: true,
  deprecated: false,
  typeStatus: 'unaware',
};

describe('renderRulesTable', () => {
  it('emits the canonical 11-column schema with glyph for type-unaware', () => {
    const out = renderRulesTable([SAMPLE_RULE], 'reliability', 'quality');
    expect(out.split('\n')[0]).toBe(
      '| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |',
    );
    expect(out).toContain('🟢'); // unaware
    expect(out).toContain('💼'); // recommended
    expect(out).toContain('💡'); // suggestions
    expect(out).toContain(
      '/docs/quality/plugin-reliability/rules/no-silent-errors',
    );
  });

  it('uses 🟡 for optional and 🟠 for aware', () => {
    const refining: RuleMeta = { ...SAMPLE_RULE, typeStatus: 'optional' };
    const graceful: RuleMeta = { ...SAMPLE_RULE, typeStatus: 'aware' };
    expect(renderRulesTable([refining], 'reliability', 'quality')).toContain('🟡');
    expect(renderRulesTable([graceful], 'reliability', 'quality')).toContain('🟠');
  });

  it('sorts rules alphabetically by name', () => {
    const rules: RuleMeta[] = [
      { ...SAMPLE_RULE, name: 'zebra' },
      { ...SAMPLE_RULE, name: 'apple' },
      { ...SAMPLE_RULE, name: 'mango' },
    ];
    const out = renderRulesTable(rules, 'reliability', 'quality');
    const order = out.match(/\[(apple|mango|zebra)\]/g) ?? [];
    expect(order).toEqual(['[apple]', '[mango]', '[zebra]']);
  });
});

describe('spliceTable', () => {
  // A focused fixture that mirrors the real reliability/README.md structure:
  // legend table, blank line, rule data table, blank line, neighboring table
  // (Related Plugins). The bug being locked here: a buggy character class
  // (`[\s:-|]+`) caused the lazy preamble to swallow the Related Plugins
  // table along with the rule table. The fix escapes the dash.
  const FIXTURE = `## Rules

**Legend**

| Icon | Description |
| :---: | :--- |
| 💼 | **Recommended** |

| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [error-handling](https://example.com/error-handling) |  |  |  | Enforce error handling | 🟢 |  |  |  |  |  |
| [reliability](https://example.com/reliability) |  |  |  | Enforce reliability | 🟢 |  |  |  |  |  |

## 🔗 Related ESLint Plugins

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [secure-coding](https://example.com) | 1k | General security rules |
| [crypto](https://example.com) | 2k | Crypto rules |

## 📦 Compatibility
`;

  const NEW_TABLE = renderRulesTable([SAMPLE_RULE], 'reliability', 'quality');

  it('on first run wraps the existing rule table with markers and leaves neighbors intact', () => {
    const { content, modified } = spliceTable(FIXTURE, NEW_TABLE);
    expect(modified).toBe(true);
    expect(content).toContain('AUTO-GENERATED:RULES_TABLE:START');
    expect(content).toContain('AUTO-GENERATED:RULES_TABLE:END');
    expect(content).toContain('🔗 Related ESLint Plugins');
    expect(content).toContain('| [secure-coding]');
    expect(content).toContain('| [crypto]');
    // Old rule rows replaced by the canonical sample.
    expect(content).not.toContain('error-handling](https://example.com/error-handling)');
    expect(content).not.toContain('Enforce reliability');
    expect(content).toContain('no-silent-errors');
  });

  it('is idempotent — a second run with the same table produces no change', () => {
    const first = spliceTable(FIXTURE, NEW_TABLE).content;
    const second = spliceTable(first, NEW_TABLE);
    expect(second.modified).toBe(false);
    expect(second.content).toBe(first);
  });

  it('does not eat adjacent markdown tables (regression: dash range bug)', () => {
    const { content } = spliceTable(FIXTURE, NEW_TABLE);
    // Both Related-Plugin rows must still be present after splicing.
    expect(content.match(/\| \[(secure-coding|crypto)\]/g)).toHaveLength(2);
    // The legend's "| Icon | Description |" must still be present and outside markers.
    const startIdx = content.indexOf('AUTO-GENERATED:RULES_TABLE:START');
    const legendIdx = content.indexOf('| Icon | Description |');
    expect(legendIdx).toBeGreaterThan(-1);
    expect(legendIdx).toBeLessThan(startIdx);
  });

  it('throws when no rule-data table can be located (avoids silent corruption)', () => {
    const noTable = '## Rules\n\nSome prose with no table.\n\n## 📦 Compatibility\n';
    expect(() => spliceTable(noTable, NEW_TABLE)).toThrow(/locate existing rule-data table/);
  });

  it('throws when `## Rules` heading is missing (refuses to splice into the wrong section)', () => {
    // Regression: a `| Rule |` parity/compat table sitting above the (missing)
    // Rules section used to be auto-wrapped with markers and have its content
    // replaced by the rule table — silently corrupting the parity matrix.
    const noRulesHeading = `## 🔄 Parity with \`eslint-plugin-import\`

| Rule | Original Plugin | Status | Notes |
| :--- | :--- | :--- | :--- |
| All Rules | eslint-plugin-import | ✅ | drop-in replacement |

## 📦 Compatibility
`;
    expect(() => spliceTable(noRulesHeading, NEW_TABLE)).toThrow(
      /locate `## Rules` heading/,
    );
  });

  it('ignores `| Rule |` tables above `## Rules` (e.g., parity matrix) and splices only the Rules-section table', () => {
    const fixtureWithParity = `## 🔄 Parity with \`eslint-plugin-import\`

| Rule | Original Plugin | Status | Notes |
| :--- | :--- | :--- | :--- |
| All Rules | eslint-plugin-import | ✅ | drop-in replacement |

## Rules

| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [old-rule](https://example.com/old) |  |  |  | Old description | 🟢 |  |  |  |  |  |

## 📦 Compatibility
`;
    const { content, modified } = spliceTable(fixtureWithParity, NEW_TABLE);
    expect(modified).toBe(true);
    // Parity table must remain untouched, not wrapped in markers.
    expect(content).toContain('| All Rules | eslint-plugin-import | ✅ | drop-in replacement |');
    // The rule table inside `## Rules` is the one that got wrapped.
    const startIdx = content.indexOf('AUTO-GENERATED:RULES_TABLE:START');
    const rulesIdx = content.indexOf('## Rules');
    expect(startIdx).toBeGreaterThan(rulesIdx);
    expect(content).not.toContain('| [old-rule]');
    expect(content).toContain('no-silent-errors');
  });
});

describe('loadPluginRegistry', () => {
  it('parses the canonical 20-plugin registry from apps/docs/src/lib/plugins.ts', () => {
    const registry = loadPluginRegistry(resolve(ROOT, 'apps', 'docs', 'src', 'lib', 'plugins.ts'));
    expect(registry.length).toBe(20);
    const slugs = registry.map((p) => p.slug);
    expect(slugs).toContain('reliability');
    expect(slugs).toContain('browser-security');
    for (const p of registry) {
      expect(['security', 'quality']).toContain(p.pillar);
      expect(p.package).toMatch(/^eslint-plugin-[a-z][a-z0-9-]*$/);
    }
  });
});

describe('loadTypeAwarenessMap', () => {
  it('returns a per-rule classification with at least one entry per plugin', () => {
    const map = loadTypeAwarenessMap(resolve(ROOT, '.agent', 'type-awareness-scan.tsv'));
    expect(map.size).toBeGreaterThan(300);
    // Spot-check known entries.
    expect(['unaware', 'optional', 'aware']).toContain(
      map.get('import-next/named'),
    );
    expect(map.get('reliability/no-silent-errors')).toBe('unaware');
  });
});
