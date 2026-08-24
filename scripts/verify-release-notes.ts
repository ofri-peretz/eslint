#!/usr/bin/env tsx

/**
 * verify-release-notes.ts — check the release notes that actually published.
 *
 * ## Why this exists
 *
 * Everything upstream of the publish is unit-tested: the formatter, the
 * rollup, the changelog normaliser, the changeset quality gate. None of that
 * tests the *artifact*. Between a green test suite and a reader on npm sit a
 * markdown slice, a shell heredoc, a `gh release create`, and GitHub's own
 * renderer — and every defect found in this system so far was found by opening
 * the published page and reading it, not by running the tests.
 *
 * So this is that reading, automated. It fetches the GitHub Release bodies a
 * run just created and asserts the properties a human would check first.
 *
 * ## What it asserts
 *
 * - **The body is not a stub.** `extract-changelog.ts --fallback` emits
 *   "See package CHANGELOG for details" when it cannot find the version. That
 *   is the correct behaviour for the script and a bad release note; it means
 *   the CHANGELOG and the published version disagree.
 * - **The upgrade verdict is present.** It is the one line a reader needs, and
 *   the one most likely to be lost if the footer logic regresses.
 * - **Published packages carry an install line**, with the right version.
 * - **No raw link plumbing.** A bullet starting `[#123](…)` means the
 *   formatter's parsing regressed and the reader is looking at 120 characters
 *   of URL before the first word.
 * - **No unrendered markdown artefacts** — an odd number of backticks means a
 *   code span was split by the extraction and renders as literal punctuation.
 *
 * ## Exit codes
 *
 * 0 unless `--strict`. This runs *after* the packages are on npm: failing the
 * workflow cannot un-publish anything, and a red X on a successful release
 * teaches people to ignore red Xs. It reports loudly and lets the run pass;
 * `--strict` is for testing the checker itself.
 *
 * Usage:
 *   tsx scripts/verify-release-notes.ts --tags="a@1.0.0,b@2.0.0"
 *   tsx scripts/verify-release-notes.ts --latest=5
 */

import { execFileSync } from 'node:child_process';
import process from 'node:process';

const STRICT = process.argv.includes('--strict');

function arg(flag: string): string | undefined {
  const found = process.argv.slice(2).find((a) => a.startsWith(`${flag}=`));
  return found ? found.slice(flag.length + 1) : undefined;
}

function gh(args: string[]): string {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

export interface Finding {
  tag: string;
  rule: string;
  message: string;
}

/** `eslint-plugin-x@2.1.0` → `{ name, version }`; scoped tags keep their scope. */
function parseTag(tag: string): { name: string; version: string } | null {
  const at = tag.lastIndexOf('@');
  if (at <= 0) return null;
  return { name: tag.slice(0, at), version: tag.slice(at + 1) };
}

export function verify(tag: string, body: string): Finding[] {
  const findings: Finding[] = [];
  const add = (rule: string, message: string) =>
    findings.push({ tag, rule, message });

  if (body.trim() === '') {
    add('RN001', 'Release body is empty.');
    return findings;
  }

  if (/auto-generation pending/i.test(body)) {
    // The fallback stub. It means extract-changelog could not find this
    // version's section — the CHANGELOG and the published version disagree.
    add(
      'RN002',
      'Body is the fallback stub — the version has no CHANGELOG section.',
    );
  }

  const hasVerdict =
    /Safe to upgrade/.test(body) ||
    /breaking change/i.test(body) ||
    /Nothing published to npm/.test(body);
  if (!hasVerdict) {
    add(
      'RN003',
      'No upgrade verdict — the reader is not told if this is safe.',
    );
  }

  // Rollup releases are not per-package and carry no install line, by design.
  const isRollup = tag.startsWith('release-');
  const parsed = parseTag(tag);

  if (!isRollup && parsed) {
    // The tag is the *unscoped* name (release.yml strips the scope when it
    // builds `<name>@<version>`), while the install line in the body carries
    // the full package name. So `@interlace/eslint-devkit@2.0.0` publishes as
    // tag `eslint-devkit@2.0.0`, and a literal comparison against the tag name
    // fails on the `@interlace/` sitting between the prefix and the name —
    // every scoped package would report RN004 on every run.
    //
    // Match the version and the unscoped name, allowing an optional scope.
    const escaped = parsed.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedVersion = parsed.version.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );
    const install = new RegExp(
      `npm install --save-dev (?:@[^/\\s]+/)?${escaped}@${escapedVersion}\\b`,
    );

    // Private workspaces get no install line; they also get no GitHub Release
    // from release.yml, so anything reaching here should have one.
    if (!install.test(body)) {
      add(
        'RN004',
        `Missing or wrong install line — expected \`npm install --save-dev ${parsed.name}@${parsed.version}\` (a scope prefix is fine).`,
      );
    }
  }

  for (const line of body.split('\n')) {
    if (/^-\s*\[#\d+\]\(/.test(line)) {
      add(
        'RN005',
        `Bullet leads with raw link plumbing: ${line.slice(0, 60)}…`,
      );
      break;
    }
  }

  // An odd backtick count means a code span was split — usually by a slice
  // that cut through one — and renders as stray punctuation.
  const backticks = (body.match(/`/g) ?? []).length;
  if (backticks % 2 !== 0) {
    add('RN006', `Unbalanced backticks (${backticks}) — a code span is split.`);
  }

  return findings;
}

function main() {
  const explicit = arg('--tags');
  const latest = Number.parseInt(arg('--latest') ?? '5', 10);

  let tags: string[];
  if (explicit) {
    tags = explicit
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  } else {
    try {
      tags = gh([
        'release',
        'list',
        '--limit',
        String(Number.isNaN(latest) ? 5 : latest),
        '--json',
        'tagName',
        '--jq',
        '.[].tagName',
      ])
        .split('\n')
        .filter(Boolean);
    } catch (error) {
      console.warn(
        `::warning::Could not list releases: ${(error as Error).message.split('\n')[0]}`,
      );
      process.exit(0);
    }
  }

  if (tags.length === 0) {
    console.log('No releases to verify.');
    process.exit(0);
  }

  const findings: Finding[] = [];
  let checked = 0;

  for (const tag of tags) {
    let body: string;
    try {
      body = gh(['release', 'view', tag, '--json', 'body', '--jq', '.body']);
    } catch {
      findings.push({
        tag,
        rule: 'RN000',
        message: 'Release not found — the tag exists but no Release does.',
      });
      continue;
    }
    checked++;
    findings.push(...verify(tag, body));
  }

  if (findings.length === 0) {
    console.log(`✅ ${checked} release note(s) verified — all well-formed.`);
    process.exit(0);
  }

  console.error(
    `⚠️  ${findings.length} issue(s) across ${checked} release note(s):`,
  );
  for (const f of findings) {
    console.error(`   ${f.rule}  ${f.tag}`);
    console.error(`         ${f.message}`);
  }
  console.error('');
  console.error(
    'These notes are already published; fix the generator and re-run',
  );
  console.error('`release-hygiene.yml` to rewrite the affected bodies.');

  process.exit(STRICT ? 1 : 0);
}

// Guarded so the lock test can import `verify` without shelling out to `gh`.
if (process.argv[1] && process.argv[1].endsWith('verify-release-notes.ts')) {
  main();
}
