/**
 * Tests for the name-inference gate (#508).
 *
 * The distinctions under test are the ones that took three attempts to get
 * right, and each is a case where a wrong answer is actively harmful: a gate
 * that flags exact membership would push authors to undo the correct fix, and
 * a gate that misses the nested-binding form is a gate that reports success
 * having checked nothing.
 */
import { describe, expect, it } from 'vitest';
import { checkNameInference, findNameSubstringSites } from '../lint-name-inference';

describe('findNameSubstringSites', () => {
  it('flags a substring test on an identifier name', () => {
    const sites = findNameSubstringSites(`
      const varName = node.id.name.toLowerCase();
      if (varName.includes('password')) report(node);
    `);
    expect(sites).toHaveLength(1);
    expect(sites[0].text).toContain("varName.includes('password')");
  });

  it('flags the inline form without a binding', () => {
    const sites = findNameSubstringSites(`
      if (node.callee.name.toLowerCase().includes('credential')) report(node);
    `);
    expect(sites).toHaveLength(1);
  });

  it('finds a binding declared inside a function-expression initializer', () => {
    // The shape that no-xxe-injection uses. An earlier regex consumed to the
    // first `;` — which is *inside* the arrow body — and skipped this binding
    // entirely, so the rule scanned clean while matching names by substring.
    const sites = findNameSubstringSites(`
      const isUntrusted = (n) => {
        const varName = n.name.toLowerCase();
        return ['req', 'body'].some((k) => varName.includes(k));
      };
    `);
    expect(sites).toHaveLength(1);
  });

  it('does NOT flag exact membership on a name', () => {
    // `REQUEST_ROOTS.has(node.name)` is a naming convention, not an inference
    // from spelling. Flagging it would implicate two dozen correct rules.
    const sites = findNameSubstringSites(`
      const REQUEST_ROOTS = new Set(['req', 'request']);
      if (REQUEST_ROOTS.has(node.name.toLowerCase())) return true;
    `);
    expect(sites).toEqual([]);
  });

  it('does NOT flag Array.includes on a tokenised name', () => {
    // The hardened form from no-sensitive-data-exposure: split the name into
    // words first, then match whole words. `login`/`dialog`/`catalog`/`blog`
    // all contain "log"; none of them is a logger. This is the fix for the
    // defect class, and a gate that flagged it would be self-refuting.
    const sites = findNameSubstringSites(`
      const words = node.callee.name
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .split(/[^a-z0-9]+/);
      if (words.includes('log')) return true;
    `);
    expect(sites).toEqual([]);
  });

  it('does NOT flag prose in comments', () => {
    const sites = findNameSubstringSites(`
      // We used to do varName.includes('password') here, which was wrong.
      /* propName.includes('phone') matched phoneBookLength. */
      return false;
    `);
    expect(sites).toEqual([]);
  });

  it('does NOT flag anchored tests', () => {
    // startsWith/endsWith are anchored; they cannot match mid-identifier.
    const sites = findNameSubstringSites(`
      const varName = node.id.name;
      if (varName.startsWith('is') || varName.endsWith('Handler')) return true;
    `);
    expect(sites).toEqual([]);
  });
});

describe('checkNameInference', () => {
  const offending = `const n = node.id.name.toLowerCase();\nif (n.includes('secret')) report(node);`;

  it('fails an unregistered rule — the gate is not vacuous', () => {
    const report = checkNameInference([{ file: 'p/src/rules/new-rule/index.ts', source: offending }], []);
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0].file).toBe('p/src/rules/new-rule/index.ts');
  });

  it('passes a registered rule', () => {
    const report = checkNameInference(
      [{ file: 'p/src/rules/known/index.ts', source: offending }],
      [{ file: 'p/src/rules/known/index.ts', direction: 'report', reason: 'known debt' }],
    );
    expect(report.violations).toEqual([]);
    expect(report.staleRegistry).toEqual([]);
  });

  it('fails a registry entry whose sites are gone — the debt list cannot rot', () => {
    const report = checkNameInference(
      [{ file: 'p/src/rules/fixed/index.ts', source: 'const ok = NAMES.has(node.name);' }],
      [{ file: 'p/src/rules/fixed/index.ts', direction: 'report', reason: 'was debt' }],
    );
    expect(report.violations).toEqual([]);
    expect(report.staleRegistry).toHaveLength(1);
    expect(report.staleRegistry[0]).toContain('delete the entry');
  });
});
