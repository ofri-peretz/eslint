#!/usr/bin/env tsx
/**
 * check-fix-carries-test.ts: a `fix` pull request that changes code must also change a test.
 *
 * "Lock everything you fix" was a CLAUDE.md line every session read. This makes it a merge gate
 * instead: the reviewer no longer has to remember it, and the failure names where a lock goes.
 * It cannot tell whether the test fails when the fix is reverted; `check:lock-proofs` and the
 * triggerlist `lock-still-bites` review own that question.
 *
 * Code is any .js/.ts family file that is not a test or a .d.ts declaration. Docs, workflows, configs and lockfiles are
 * not code, so `fix(deps)` bumps and CI-only fixes pass.
 *
 *   PR_TITLE='fix(x): y' npx tsx scripts/check-fix-carries-test.ts [--base origin/main]
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const FIX_TITLE = /^fix(?:\([^)]*\))?!?:/u;
const CODE = /(?<!\.d)\.[cm]?[jt]sx?$/u;
const TEST = /(?:\.|-)(?:test|spec)\.[cm]?[jt]sx?$|(?:^|\/)__tests__\//u;

export interface FixVerdict {
  ok: boolean;
  message: string;
}

export function judgeFix(title: string, files: readonly string[]): FixVerdict {
  if (!FIX_TITLE.test(title))
    return { ok: true, message: 'not a fix: no test required' };
  const tests = files.filter((f) => TEST.test(f));
  const code = files.filter((f) => CODE.test(f) && !TEST.test(f));
  if (code.length === 0)
    return { ok: true, message: 'a fix with no code change: no test required' };
  if (tests.length > 0)
    return {
      ok: true,
      message: `a fix with ${tests.length} test file(s) changed`,
    };
  return {
    ok: false,
    message:
      `this fix changes ${code.length} code file(s) and no test. fix: add a lock that fails when the fix is ` +
      "reverted (apps/docs/src/__tests__/*-lock.test.ts(x), scripts/__tests__/, or the package's tests), " +
      'or retitle the PR if it is not a fix.',
  };
}

function main(): void {
  const baseFlag = process.argv.indexOf('--base');
  const base =
    baseFlag === -1
      ? 'origin/main'
      : (process.argv[baseFlag + 1] ?? 'origin/main');
  const files = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);
  const verdict = judgeFix(process.env['PR_TITLE'] ?? '', files);
  console.log(
    verdict.ok ? `✔ ${verdict.message}` : `::error::${verdict.message}`,
  );
  process.exitCode = verdict.ok ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
