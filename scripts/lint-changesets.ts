#!/usr/bin/env tsx

/**
 * lint-changesets.ts — quality gate for `.changeset/*.md`.
 *
 * ## Why this is a gate and not a checklist
 *
 * A changeset is the only input to release notes, and it is written once, in a
 * hurry, at the end of a PR. Everything downstream — the package CHANGELOG,
 * the rollup, the GitHub Release, the npm page a stranger reads before
 * installing — is a rendering of that one paragraph. There is no later step
 * where quality gets added, and there is no reviewer whose job it is to catch
 * "update stuff" before it becomes a permanent public record.
 *
 * `changeset-validity.test.ts` already asserts a changeset *parses* and names
 * real packages. This asserts it is worth publishing.
 *
 * The rule that earns this file on its own is **BREAKING_NEEDS_MIGRATION**. A
 * major bump on a published ESLint plugin means someone's build breaks on
 * upgrade. Shipping that with a one-line summary and no upgrade path is the
 * single most expensive thing this repo can do to its users, it is invisible
 * until after publish, and npm has no undo. Every other rule here is cheap
 * hygiene; that one is the reason the gate is not advisory.
 *
 * ## Rules
 *
 * Errors (block):
 *   CS001  summary-present         — a changeset with no prose publishes an empty entry
 *   CS002  breaking-needs-migration — major/`!`/BREAKING CHANGE on a *published*
 *                                    package needs an upgrade path with a code example
 *   CS003  major-needs-body        — a major bump needs more than a title
 *   CS004  no-placeholder          — "TODO", "WIP", "fix stuff", "update deps"
 *   CS005  title-too-short         — under 10 chars is not a description
 *
 * Warnings (report, don't block):
 *   CS006  conventional-prefix     — no `feat:`/`fix:`/… prefix; the badge falls
 *                                    back to the bump level, which is less precise
 *   CS007  title-too-long          — over 120 chars; the tail gets lost in the rollup
 *   CS008  duplicate-title         — two changesets with the same title, usually
 *                                    a copy-paste that will render twice
 *
 * Private workspaces are exempt from CS002/CS003: nobody installs `apps/docs`,
 * so there is no consumer with a build to migrate. The bump still has to say
 * something (CS001/CS004/CS005 apply everywhere).
 *
 * Usage:
 *   tsx scripts/lint-changesets.ts           # lint every changeset
 *   tsx scripts/lint-changesets.ts --json
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const WORKSPACE_ROOTS = ['packages', 'apps'];
const JSON_OUT = process.argv.includes('--json');

function arg(flag: string): string | undefined {
  const found = process.argv.slice(2).find((a) => a.startsWith(`${flag}=`));
  return found ? found.slice(flag.length + 1) : undefined;
}

/** Overridable so the lock test can point the linter at fixtures. */
const CHANGESET_DIR = arg('--dir') ?? '.changeset';

const KNOWN_PREFIXES = [
  'feat',
  'fix',
  'perf',
  'security',
  'docs',
  'refactor',
  'build',
  'ci',
  'test',
  'chore',
  'style',
  'revert',
];

/**
 * Text that means "I did not write a summary". Matched against the whole
 * title, not as a substring — "update the peer range to include v7" is a fine
 * summary and must not trip on the word "update".
 */
const PLACEHOLDER_TITLES = [
  /^(todo|wip|tbd|xxx|placeholder|changeset)\b/i,
  /^(fix|update|change|tweak|improve|refactor|bump)(\s+(it|this|that|stuff|things|deps|dependencies|code|bug|bugs|issue|issues))?[.!]?$/i,
  /^(minor|patch|major)\s*(fix|update|change)?[.!]?$/i,
  /^lorem ipsum/i,
];

export interface Finding {
  rule: string;
  level: 'error' | 'warning';
  file: string;
  message: string;
}

/** name → private?, for the CS002/CS003 exemption. */
function workspacePrivacy(): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const root of WORKSPACE_ROOTS) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root)) {
      const pkgPath = join(root, entry, 'package.json');
      if (!existsSync(pkgPath)) continue;
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
          name?: string;
          private?: boolean;
        };
        if (pkg.name) map.set(pkg.name, pkg.private === true);
      } catch {
        /* changeset-validity.test.ts owns malformed manifests */
      }
    }
  }
  return map;
}

interface Changeset {
  file: string;
  releases: Array<{ name: string; type: string }>;
  summary: string;
  title: string;
  body: string;
}

function parse(dir: string, file: string): Changeset | null {
  const raw = readFileSync(join(dir, file), 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n?---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return null;

  const [, frontmatter, summary] = match;
  const releases: Array<{ name: string; type: string }> = [];
  for (const line of frontmatter.split('\n')) {
    const entry = /^\s*['"]?([^'":]+)['"]?\s*:\s*(\w+)\s*$/.exec(line);
    if (entry) releases.push({ name: entry[1].trim(), type: entry[2].trim() });
  }

  // Same title/body split the formatter uses, so the gate judges exactly the
  // text that will be published. See `.changeset/changelog.cjs`.
  const trimmed = summary.trim();
  const breakAt = trimmed.search(/\n[ \t]*\n/);
  const firstPara = breakAt === -1 ? trimmed : trimmed.slice(0, breakAt);
  const title = firstPara
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ');
  const body = breakAt === -1 ? '' : trimmed.slice(breakAt).trim();

  return { file, releases, summary: trimmed, title, body };
}

/** Strip a conventional-commit prefix so rules judge the actual description. */
function bareTitle(title: string): string {
  const match = /^([a-z]+)(?:\([^)]*\))?!?:\s*(.+)$/.exec(title);
  if (match && KNOWN_PREFIXES.includes(match[1])) return match[2].trim();
  return title;
}

/**
 * Is this changeset breaking *for someone who installs a published package*?
 *
 * `published` is the subset of the changeset's releases that ship to npm. The
 * major bump is checked only against those: one changeset can carry
 * `'docs': major` (an app, nobody installs it) alongside
 * `'eslint-plugin-x': patch`, and reading the major across the whole file
 * would demand a migration guide for a patch that breaks nothing.
 *
 * The `!` marker and a `BREAKING CHANGE:` footer stay summary-wide — those are
 * the author stating intent about the change itself, not about one entry in
 * the frontmatter.
 */
function isBreaking(
  cs: Changeset,
  published: Array<{ name: string; type: string }>,
): boolean {
  if (published.some((r) => r.type === 'major')) return true;
  if (/^[a-z]+(?:\([^)]*\))?!:/.test(cs.title)) return true;
  return /^BREAKING[ -]CHANGE:/m.test(cs.summary);
}

/**
 * Does the body actually tell someone how to upgrade?
 *
 * Two signals, both required: a migration cue (a heading or bolded lead-in
 * naming the upgrade), and a fenced code block. Prose alone reliably describes
 * *what* broke without ever showing what to type instead — which is the part a
 * reader is looking for at 2am when their build is red.
 */
function hasMigrationPath(body: string): boolean {
  const cue =
    /(^|\n)\s*(#{1,6}\s*|\*\*)?(migration|migrating|upgrade|upgrading|how to migrate|before\b.*\bafter)/i.test(
      body,
    );
  const example = /```/.test(body);
  return cue && example;
}

export function lint(
  dir: string = CHANGESET_DIR,
  privacyOverride?: Map<string, boolean>,
): Finding[] {
  const findings: Finding[] = [];
  const privacy = privacyOverride ?? workspacePrivacy();

  const files = readdirSync(dir).filter(
    (f) => f.endsWith('.md') && f !== 'README.md',
  );

  const titles = new Map<string, string>();

  for (const file of files) {
    const cs = parse(dir, file);
    // A file that doesn't parse is changeset-validity.test.ts's finding, not
    // ours — reporting it twice makes the real error harder to spot.
    if (!cs) continue;

    // An intentionally empty changeset (no releases, no summary) is a valid
    // "this diff needs no release" marker. Nothing to lint.
    if (cs.releases.length === 0 && cs.summary === '') continue;

    const bare = bareTitle(cs.title);
    const publishedReleases = cs.releases.filter(
      (r) => privacy.get(r.name) === false,
    );

    if (cs.summary === '') {
      findings.push({
        rule: 'CS001',
        level: 'error',
        file,
        message:
          'Changeset bumps a version but has no summary — it would publish an empty entry.',
      });
      continue;
    }

    if (
      isBreaking(cs, publishedReleases) &&
      publishedReleases.length > 0 &&
      !hasMigrationPath(cs.body)
    ) {
      findings.push({
        rule: 'CS002',
        level: 'error',
        file,
        message:
          `Breaking change to published package(s) ${publishedReleases.map((r) => r.name).join(', ')} ` +
          'with no upgrade path. Add a "## Migration" section showing the before/after in a code block — ' +
          'npm has no undo, and this text is all a consumer gets.',
      });
    }

    // Same scoping as CS002: only a published major owes an explanation.
    if (publishedReleases.some((r) => r.type === 'major') && cs.body === '') {
      findings.push({
        rule: 'CS003',
        level: 'error',
        file,
        message:
          'Major bump with a title and nothing else. Explain what broke and why.',
      });
    }

    if (PLACEHOLDER_TITLES.some((re) => re.test(bare))) {
      findings.push({
        rule: 'CS004',
        level: 'error',
        file,
        message: `Placeholder summary: "${cs.title}". Describe the change from a consumer's point of view.`,
      });
    } else if (bare.length < 10) {
      findings.push({
        rule: 'CS005',
        level: 'error',
        file,
        message: `Summary is ${bare.length} characters ("${cs.title}") — too short to be a description.`,
      });
    }

    if (
      !/^([a-z]+)(?:\([^)]*\))?!?:/.test(cs.title) ||
      !KNOWN_PREFIXES.includes(/^([a-z]+)/.exec(cs.title)?.[1] ?? '')
    ) {
      findings.push({
        rule: 'CS006',
        level: 'warning',
        file,
        message:
          "No conventional-commit prefix — the entry's kind badge falls back to the semver level. " +
          `Prefer one of: ${KNOWN_PREFIXES.slice(0, 6).join(', ')}…`,
      });
    }

    if (cs.title.length > 120) {
      findings.push({
        rule: 'CS007',
        level: 'warning',
        file,
        message: `Summary is ${cs.title.length} characters. The rollup shows titles only — move the detail below a blank line.`,
      });
    }

    const key = bare.toLowerCase();
    const seen = titles.get(key);
    if (seen) {
      findings.push({
        rule: 'CS008',
        level: 'warning',
        file,
        message: `Same summary as ${seen} — it will render twice in the release notes.`,
      });
    } else {
      titles.set(key, file);
    }
  }

  return findings;
}

function main() {
  const findings = lint();
  const errors = findings.filter((f) => f.level === 'error');
  const warnings = findings.filter((f) => f.level === 'warning');

  if (JSON_OUT) {
    console.log(
      JSON.stringify(
        { findings, errorCount: errors.length, warningCount: warnings.length },
        null,
        2,
      ),
    );
    process.exit(errors.length > 0 ? 1 : 0);
  }

  if (findings.length === 0) {
    console.log('✅ All changesets pass the quality gate.');
    process.exit(0);
  }

  for (const finding of findings) {
    const icon = finding.level === 'error' ? '❌' : '⚠️ ';
    console[finding.level === 'error' ? 'error' : 'warn'](
      `${icon} ${finding.rule}  ${CHANGESET_DIR}/${finding.file}\n   ${finding.message}\n`,
    );
  }

  console.log(
    `${errors.length} error(s), ${warnings.length} warning(s). See .changeset/README.md for the format.`,
  );
  process.exit(errors.length > 0 ? 1 : 0);
}

// Guarded so the lock test can import `lint` without running the sweep.
if (process.argv[1] && process.argv[1].endsWith('lint-changesets.ts')) main();
