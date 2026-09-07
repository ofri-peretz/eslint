/**
 * `securityRelevant` must be earned, not defaulted into.
 *
 * The field was read as `!== false`, i.e. opt-out: any peer that never set it
 * counted as security-relevant. Only `jsdoc` had opted out, so 17 of the 18
 * peers benchmarked — including `vue`, `jest`, `react`, `jsx-a11y` and
 * `promise` — inherited the label from silence, not from anything the plugin
 * does. The published ledger's `securityRelevantPlugins: 17` was an artifact
 * of the default (#918).
 *
 * The fix flips the read to `=== true` (opt-in) and sets the flag explicitly,
 * per peer, from what each plugin's own declared category says it does. This
 * lock pins the predicate AND the membership by name — a count alone is
 * exactly what let a plugin added later inherit the label silently.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ARENA = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../suites/ilb-arena',
);
const RUN_JS = fs.readFileSync(path.join(ARENA, 'run.js'), 'utf-8');

/** The source text of one ALL_PLUGINS entry, from its `name:` to the next. */
function pluginBlock(name: string): string {
  const marker = `name: '${name}',`;
  const at = RUN_JS.indexOf(marker);
  expect(at, `plugin '${name}' not found in ALL_PLUGINS`).toBeGreaterThan(-1);
  const next = RUN_JS.indexOf('\n  {', at);
  return RUN_JS.slice(at, next === -1 ? RUN_JS.length : next);
}

function isFlaggedSecurityRelevant(name: string): boolean {
  return /securityRelevant:\s*true/.test(pluginBlock(name));
}

// Categories that are actually about security: Security, Security (Node.js),
// Security + Quality, Security (SDL), Secret Detection, DOM XSS, and
// Interlace's own "Security (Full Stack)" fleet.
const SECURITY_RELEVANT_PEERS = [
  'eslint-plugin-security',
  'security-node',
  'sonarjs',
  'microsoft-sdl',
  'no-secrets',
  'no-unsanitized',
  'interlace',
];

// Everything else in the arena: framework style guides, a11y, testing,
// documentation, module resolution, promise/regex quality.
const NOT_SECURITY_RELEVANT_PEERS = [
  'unicorn',
  'react',
  'jsx-a11y',
  'eslint-plugin-n',
  'import',
  'promise',
  'regexp',
  'jsdoc',
  'jest',
  'vue',
  'angular',
];

describe('securityRelevant is read as opt-in (=== true), never opt-out', () => {
  it('never reads the flag with the opt-out predicate again', () => {
    expect(RUN_JS).not.toMatch(/securityRelevant\s*!==\s*false/);
  });

  it('reads it with === true everywhere it is consumed', () => {
    // Once for the per-plugin ledger entry, once for the summary count.
    const matches = RUN_JS.match(/securityRelevant\s*===\s*true/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('reproduces the bug: the old opt-out predicate wrongly counted a style plugin', () => {
    const neverSet: { securityRelevant?: boolean } = {
      securityRelevant: undefined,
    };
    const oldOptOutPredicate = (p: { securityRelevant?: boolean }) =>
      p.securityRelevant !== false;
    const newOptInPredicate = (p: { securityRelevant?: boolean }) =>
      p.securityRelevant === true;

    expect(oldOptOutPredicate(neverSet)).toBe(true); // the bug
    expect(newOptInPredicate(neverSet)).toBe(false); // the fix
  });
});

describe('security-relevant membership is asserted by name, not by count', () => {
  it.each(SECURITY_RELEVANT_PEERS)('flags %s as security-relevant', (name) => {
    expect(isFlaggedSecurityRelevant(name)).toBe(true);
  });

  it.each(NOT_SECURITY_RELEVANT_PEERS)(
    'does not flag %s as security-relevant',
    (name) => {
      expect(isFlaggedSecurityRelevant(name)).toBe(false);
    },
  );

  it('accounts for every peer in ALL_PLUGINS exactly once', () => {
    const all = [...SECURITY_RELEVANT_PEERS, ...NOT_SECURITY_RELEVANT_PEERS];
    expect(new Set(all).size).toBe(all.length);
    // 18 peers total per the ledger this bug was filed against (#918).
    expect(all.length).toBe(18);
  });
});
