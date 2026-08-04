/**
 * Lock for the plugin-taxonomy guard. The failure mode of an allowlist-based
 * check is that it passes forever — these cases prove it still bites.
 *
 * Run from the repo root:
 *   npx vitest run scripts/__tests__/plugin-taxonomy.test.ts
 */

import { describe, it, expect } from 'vitest';

import { findSdkTokens, checkTaxonomy, stringLiterals } from '../lint-plugin-taxonomy.js';

const ALLOWLIST = [
  { file: 'p/src/rules/known/index.ts', tokens: ['express'], reason: 'grandfathered' },
];

describe('findSdkTokens', () => {
  it('flags an SDK identifier compared against in the detection path', () => {
    const source = `if (callee.type === 'Identifier' && callee.name === 'multer') return;`;
    expect(findSdkTokens(source)).toEqual(['multer']);
  });

  it('ignores libraries named in remediation prose and doc links', () => {
    const source = `
      fix: 'Use ldapjs or libraries with automatic escaping',
      documentationLink: 'https://www.npmjs.com/package/ldapjs',
    `;
    expect(findSdkTokens(source)).toEqual([]);
  });

  it('does not fire on ordinary rule identifiers that collide with package names', () => {
    // 'request' is a taint-source name, 'next' the Express middleware param —
    // both were false positives on the first run of the guard.
    const source = `const TAINT_SOURCES = ['req', 'request', 'next', 'ctx'];`;
    expect(findSdkTokens(source)).toEqual([]);
  });

  it('reads single, double and plain template literals', () => {
    expect(stringLiterals(`a('x'); b("y"); c(\`z\`);`)).toEqual(['x', 'y', 'z']);
  });
});

describe('checkTaxonomy', () => {
  it('fails a NEW SDK gate in a code-agnostic plugin', () => {
    const report = checkTaxonomy(
      [{ file: 'p/src/rules/fresh/index.ts', source: `name === 'sequelize'` }],
      ALLOWLIST,
    );
    expect(report.violations).toEqual([{ file: 'p/src/rules/fresh/index.ts', tokens: ['sequelize'] }]);
  });

  it('stays quiet for a grandfathered file on its recorded tokens', () => {
    const report = checkTaxonomy(
      [{ file: 'p/src/rules/known/index.ts', source: `name === 'express'` }],
      ALLOWLIST,
    );
    expect(report.violations).toEqual([]);
    expect(report.staleAllowlist).toEqual([]);
  });

  it('still fails a grandfathered file that picks up a NEW token', () => {
    const report = checkTaxonomy(
      [{ file: 'p/src/rules/known/index.ts', source: `n === 'express' || n === 'fastify'` }],
      ALLOWLIST,
    );
    expect(report.violations).toEqual([{ file: 'p/src/rules/known/index.ts', tokens: ['fastify'] }]);
  });

  it('fails when an allowlist entry goes stale so the debt list cannot rot', () => {
    const report = checkTaxonomy(
      [{ file: 'p/src/rules/known/index.ts', source: `// migrated out` }],
      ALLOWLIST,
    );
    expect(report.staleAllowlist).toHaveLength(1);
    expect(report.staleAllowlist[0]).toContain('delete the entry');
  });

  it('flags a PARTIALLY migrated entry, naming the tokens that are gone', () => {
    // The likelier real case: someone moves one of a rule's SDK gates and
    // leaves the rest. The entry must be updated, not deleted — so this
    // reports the missing token WITHOUT the "delete the entry" instruction.
    const partial = [
      { file: 'p/src/rules/known/index.ts', tokens: ['express', 'fastify'], reason: 'grandfathered' },
    ];
    const report = checkTaxonomy(
      [{ file: 'p/src/rules/known/index.ts', source: `n === 'express'` }],
      partial,
    );
    expect(report.violations).toEqual([]);
    expect(report.staleAllowlist).toHaveLength(1);
    expect(report.staleAllowlist[0]).toContain('fastify');
    expect(report.staleAllowlist[0]).not.toContain('delete the entry');
  });
});
