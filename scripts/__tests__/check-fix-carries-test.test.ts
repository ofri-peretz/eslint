import { describe, expect, it } from 'vitest';

import { judgeFix } from '../check-fix-carries-test';

describe('judgeFix', () => {
  it('asks nothing of a title that is not a fix', () => {
    expect(judgeFix('feat(x): y', ['packages/a/src/rule.ts']).ok).toBe(true);
    expect(judgeFix('chore: fix: later', ['packages/a/src/rule.ts']).ok).toBe(
      true,
    );
  });

  it('fails a fix that changes code and no test, and names where the lock goes', () => {
    for (const title of ['fix: y', 'fix(docs): y', 'fix!: y', 'fix(a)!: y']) {
      const verdict = judgeFix(title, ['packages/a/src/rule.ts', 'README.md']);
      expect(verdict.ok, title).toBe(false);
      expect(verdict.message).toContain(
        'apps/docs/src/__tests__/*-lock.test.ts(x)',
      );
    }
  });

  it('passes a fix that changes a test beside the code', () => {
    for (const test of [
      'apps/docs/src/__tests__/nav-lock.test.tsx',
      'packages/a/src/rule.test.ts',
      'scripts/__tests__/x.ts',
      'a/b-spec.mjs',
    ]) {
      expect(
        judgeFix('fix(a): y', ['packages/a/src/rule.ts', test]).ok,
        test,
      ).toBe(true);
    }
  });

  it('passes a fix that changes no code: docs, workflows, lockfiles', () => {
    expect(
      judgeFix('fix(deps): bump', [
        'package.json',
        'package-lock.json',
        '.github/workflows/ci.yml',
        'docs/a.md',
      ]).ok,
    ).toBe(true);
  });
});
