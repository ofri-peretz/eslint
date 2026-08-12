/**
 * Regression lock — only ONE file in the tree may be named like a security policy.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BUG (2026-08-12)
 * OpenSSF Scorecard's Security-Policy check sat at 4/10 reporting
 * `no linked content found`, while the root `SECURITY.md` plainly carried the
 * advisory URL, the disclosure email, and a timeline table. Reproduced against
 * live `main` with the official container, so it was not a stale alert.
 *
 * Scorecard resolves the policy file in two independent steps, and they can
 * disagree:
 *
 *   1. `isSecurityPolicyFilename` matches the FULL path against a fixed list
 *      (`security.md`, `.github/security.md`, `docs/security.md`, …). Only the
 *      root `SECURITY.md` qualified, so the *reported* file was correct.
 *
 *   2. The CONTENT is then fetched with `OnMatchingFileContentDo` using that
 *      path as a glob. `isMatchingPath` tries the full path and, on failure,
 *      retries against `path.Base(fullpath)` — so the pattern `security.md`
 *      matches *any* `security.md` at *any* depth. `checkSecurityPolicyFileContent`
 *      parses the first non-empty match and returns false ("stop looking").
 *
 * We had `.agent/agents/security.md`, an agent persona doc. It sorted ahead of
 * the root file, so Scorecard scored `SECURITY.md` against that file's text:
 * 0 URLs, 0 emails, but 8 occurrences of "vuln"/"disclos". That is exactly the
 * finding set Scorecard reported — text and disclosure hits, no linked content.
 *
 * Renaming it to `security-expert.md` is the fix. This lock keeps it fixed: the
 * failure mode is silent (the score drops, nothing errors) and the next
 * `security.md` anywhere in the tree reintroduces it.
 *
 * @see https://github.com/ossf/scorecard/blob/main/checks/raw/security_policy.go
 * @see https://github.com/ossf/scorecard/blob/main/checks/fileparser/listing.go
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(__dirname, '../..');

/**
 * The basenames Scorecard treats as a security policy, from
 * `isSecurityPolicyFilename`. Matching is case-insensitive.
 *
 * Only basenames are listed because the basename is what the content matcher
 * actually falls back to — the directory prefixes in Scorecard's list
 * (`.github/`, `docs/`) constrain step 1 but not step 2.
 */
const POLICY_BASENAMES = [
  'security.md',
  'security.markdown',
  'security.adoc',
  'security.rst',
];

/** Scorecard's own patterns, copied verbatim from `collectPolicyHits`. */
const RE_URL = /(http|https):\/\/[a-zA-Z0-9./?=_%:-]*/;
const RE_EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,6}\b/;

const trackedFiles = (): string[] =>
  execFileSync('git', ['ls-files', '-z'], { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);

describe('OpenSSF Scorecard security-policy resolution', () => {
  it('has exactly one file whose basename Scorecard reads as a security policy', () => {
    const candidates = trackedFiles().filter((file) =>
      POLICY_BASENAMES.includes(basename(file).toLowerCase()),
    );

    // Asserting on the full list rather than a count: when this fails, the
    // message names the offending path instead of just a number.
    expect(candidates).toEqual(['SECURITY.md']);
  });

  it('scores the linked-content criterion, which is worth 6 of the 10 points', () => {
    const policy = readFileSync(resolve(REPO_ROOT, 'SECURITY.md'), 'utf8');

    // Scorecard scans line by line, so a URL split across lines does not count.
    const lines = policy.split('\n');
    expect(lines.some((line) => RE_URL.test(line))).toBe(true);
    expect(lines.some((line) => RE_EMAIL.test(line))).toBe(true);
  });
});
