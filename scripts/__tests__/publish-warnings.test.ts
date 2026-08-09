/**
 * Lock for the publish-warning gate.
 *
 * The failure mode of an allowlist-based filter is that it quietly grows to
 * swallow real findings — these cases pin what it may and may not ignore.
 *
 * Run from the repo root:
 *   npx vitest run scripts/__tests__/publish-warnings.test.ts
 */

import { describe, it, expect } from 'vitest';

import { filterWarnings } from '../lint-publish-warnings.js';

describe('filterWarnings', () => {
  it('reports the repository.url normalisation that shipped unnoticed for months', () => {
    const output = [
      'npm warn publish npm auto-corrected some errors in your package.json when publishing.',
      'npm warn publish errors corrected:',
      'npm warn publish "repository.url" was normalized to "git+https://github.com/ofri-peretz/eslint.git"',
      'npm notice package: eslint-plugin-gemini-security@0.1.0',
    ].join('\n');

    const warnings = filterWarnings(output);
    expect(warnings).toHaveLength(3);
    expect(warnings.some((w) => w.includes('repository.url'))).toBe(true);
  });

  it('ignores npm confirming it skipped a private workspace', () => {
    const output = 'npm warn publish Skipping workspace @interlace/ui, marked as private';
    expect(filterWarnings(output)).toEqual([]);
  });

  it('keeps notices and ordinary output out of the findings', () => {
    const output = [
      'npm notice 1.1kB LICENSE',
      'npm notice total files: 17',
      '+ eslint-plugin-mcp-sdk-security@0.1.0',
    ].join('\n');
    expect(filterWarnings(output)).toEqual([]);
  });

  it('does NOT swallow an unfamiliar warning — new types must fail, not pass', () => {
    const output = 'npm warn publish some future warning we have never seen';
    expect(filterWarnings(output)).toEqual(['npm warn publish some future warning we have never seen']);
  });

  it('matches the private-workspace allowlist exactly, not by keyword', () => {
    // Same words, different claim — must still be reported.
    const output = 'npm warn publish Skipping workspace @interlace/ui because the tarball is empty';
    expect(filterWarnings(output)).toHaveLength(1);
  });

  it('ignores the not-logged-in notice every unauthenticated dry-run emits', () => {
    // CI holds no npm token by design, so this appeared once per package and
    // reported all 31 as defective on every run — a gate that always fails is
    // read as a broken gate, not as 31 findings.
    const output =
      'npm warn publish This command requires you to be logged in to https://registry.npmjs.org/ (dry-run)';
    expect(filterWarnings(output)).toEqual([]);
  });

  it('still reports a real warning that arrives alongside the auth notice', () => {
    // The allowlist must skip the one line, not the whole dry-run's output.
    const output = [
      'npm warn publish This command requires you to be logged in to https://registry.npmjs.org/ (dry-run)',
      'npm warn publish "repository.url" was normalized to "git+https://github.com/ofri-peretz/eslint.git"',
    ].join('\n');
    expect(filterWarnings(output)).toEqual([
      'npm warn publish "repository.url" was normalized to "git+https://github.com/ofri-peretz/eslint.git"',
    ]);
  });

  it('matches the auth notice exactly, not by keyword', () => {
    // Same opening words, different claim — a genuine auth *failure* during a
    // real publish must not be swallowed by the dry-run allowance.
    const output = 'npm warn publish This command requires you to be logged in to a private registry';
    expect(filterWarnings(output)).toHaveLength(1);
  });

  it('returns nothing for clean output', () => {
    expect(filterWarnings('npm notice Publishing to https://registry.npmjs.org/')).toEqual([]);
  });
});
