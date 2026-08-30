#!/usr/bin/env tsx

/**
 * check-intent.ts — Stage 1 of `AI_SDLC.md`, enforced.
 *
 * ## What this is for
 *
 * A prompt is not an artifact. The agent that picks the work up next week, and
 * the human reviewing a 45,000-line diff, have only what is in the repo. When
 * the "why" lives in a commit message it is not addressable and not checkable
 * against what actually happened.
 *
 * The AI-native failure mode this aims at is **drift**: an agent given a broad
 * task starts on `no-zip-slip`, notices something in `no-ssrf`, and eleven
 * plugins later nobody can say whether the result is the work that was asked
 * for. A declared blast radius turns that from a feeling into a diff.
 *
 * ## Why it is not checkbox theatre
 *
 * A gate that counts words is satisfied by a stub, and a satisfied gate that
 * checked nothing is worse than no gate — this repo has found five of those.
 * So the checks are things a stub cannot fake:
 *
 *   1. An intent file was ADDED on this branch, when the diff changes
 *      consumer-visible source. Editing an old one is not new intent.
 *   2. `packages:` is a SUPERSET of what the diff actually touches. This is
 *      the substantive one: work that spreads past its declared radius fails,
 *      naming the packages nobody declared.
 *   3. Every id in `cases:` exists in the case registry. Intent that cannot
 *      name a case it answers is a wish.
 *   4. No placeholders. `TODO` / `TBD` / `???` in a required field is a
 *      half-written intent, which looks satisfied and is not.
 *
 * ## Exit codes
 *
 * 0 unless `--strict`. Advisory by default and loud always, on the same
 * reasoning as `check-changeset-coverage`: a missing intent is a judgement the
 * author makes, and it must never be the reason a branch cannot be pushed.
 * Drift, though, is a fact — `--strict` is what CI runs.
 *
 * Usage:
 *   tsx scripts/check-intent.ts [--since=origin/main] [--strict] [--json]
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/**
 * Everything resolves against the working directory, not this file's location.
 *
 * The sibling gate (`check-changeset-coverage`) does the same, and its tests
 * depend on it: they run the script inside a throwaway repository. Pinning
 * paths to `__dirname` made every `git` call read THIS repository instead, so
 * the gate reported on the wrong diff — and in the tests it failed loudly, but
 * in a consumer's checkout it would have quietly passed.
 */
const ROOT = process.cwd();
const INTENT_DIR = path.join(ROOT, 'intent');
const REGISTRY = path.join(ROOT, 'benchmarks', 'cases', 'registry.json');

/** Paths whose change is observable by someone installing. Mirrors check-changeset-coverage. */
const RELEASE_RELEVANT = /^packages\/[^/]+\/(src\/|package\.json$)/;

/** Tests live under `src/` and ship to nobody — `files` publishes `dist/` only. */
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)__tests__\//;

/** An intent file. The directory's own README is not one. */
const INTENT_FILE = /^intent\/(?!README\.md$)[^/]+\.md$/;

const PLACEHOLDER = /\b(TODO|TBD|FIXME|\?\?\?|XXX)\b/;

/** The prose sections every intent owes. */
const REQUIRED_SECTIONS = [
  '## What',
  '## Why',
  '## Constraints',
  '## Done when',
];

function arg(flag: string): string | undefined {
  const found = process.argv.slice(2).find((a) => a.startsWith(`${flag}=`));
  return found ? found.slice(flag.length + 1) : undefined;
}

const STRICT = process.argv.includes('--strict');
const JSON_OUT = process.argv.includes('--json');
const BASE = arg('--since') ?? 'origin/main';

function git(args: string[]): string {
  // GIT_DIR leaks in from lefthook and would point at the wrong repo.
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  return execFileSync('git', args, {
    encoding: 'utf8',
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

/**
 * Abort rather than guess.
 *
 * A gate that answers "fine" when it could not look is indistinguishable from
 * a real pass, so nobody investigates. Same reasoning as the sibling gate.
 */
function fail(message: string): never {
  console.error(`❌ ${message}`);
  console.error(
    `   Cannot determine what this branch changed. Try \`git fetch origin ${BASE.replace(/^origin\//, '')}\`.`,
  );
  process.exit(1);
}

export interface Frontmatter {
  slug?: string;
  opened?: string;
  packages: string[];
  cases: string[];
}

/**
 * Parse the fixed frontmatter subset: `key: value` and `key:` + `  - item`.
 *
 * Hand-written rather than pulling in a YAML parser, because `yaml` and
 * `js-yaml` are both present only as TRANSITIVE dependencies here — a script
 * that imports one works until an unrelated lockfile change removes it.
 *
 * STRICT on purpose: a line it does not recognise is an error, never a shrug.
 * A lenient hand-rolled parser that silently drops a `packages:` entry would
 * turn the drift check — the only substantive check in this file — into a
 * no-op, and nothing would say so.
 */
export function parseFrontmatter(text: string): {
  frontmatter: Frontmatter;
  body: string;
  errors: string[];
} {
  const errors: string[] = [];
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (match === null) {
    return {
      frontmatter: { packages: [], cases: [] },
      body: text,
      errors: ['no `---` frontmatter block'],
    };
  }

  const frontmatter: Frontmatter = { packages: [], cases: [] };
  let listKey: 'packages' | 'cases' | null = null;

  for (const [index, raw] of match[1].split('\n').entries()) {
    const line = raw.replace(/\s+$/, '');
    if (line === '' || line.startsWith('#')) continue;

    const item = /^ {2}- (.+)$/.exec(line);
    if (item !== null) {
      if (listKey === null) {
        errors.push(`line ${index + 1}: list item outside a list key`);
        continue;
      }
      frontmatter[listKey].push(item[1].trim());
      continue;
    }

    const pair = /^([a-z]+):(.*)$/.exec(line);
    if (pair === null) {
      errors.push(
        `line ${index + 1}: not \`key: value\` or \`  - item\`: ${line}`,
      );
      continue;
    }

    const [, key, rest] = pair;
    const value = rest.trim();
    if (key === 'packages' || key === 'cases') {
      // `key: []` — an explicit empty list, and the ONLY inline form accepted.
      //
      // Work that touches no package is normal: a scheduled workflow, a
      // script, a measurement. Omitting the key would express it too, but
      // ambiguously — "none" and "I forgot" would look identical, and this
      // file exists to make intent explicit. The first three intents written
      // under this gate hit it immediately: two of them legitimately touch no
      // package and the parser had no way for them to say so.
      if (value === '[]') {
        listKey = null;
        continue;
      }
      if (value !== '') {
        errors.push(
          `line ${index + 1}: \`${key}\` takes a list, or \`[]\` for none — not an inline value`,
        );
        continue;
      }
      listKey = key;
      continue;
    }

    listKey = null;
    if (key === 'slug' || key === 'opened') frontmatter[key] = value;
    else errors.push(`line ${index + 1}: unknown key \`${key}\``);
  }

  return { frontmatter, body: match[2], errors };
}

/** Every case id the registry knows. */
function knownCaseIds(): Set<string> {
  try {
    const parsed = JSON.parse(readFileSync(REGISTRY, 'utf8')) as
      { cases?: Array<{ id: string }> } | Array<{ id: string }>;
    const cases = Array.isArray(parsed) ? parsed : (parsed.cases ?? []);
    return new Set(cases.map((c) => c.id));
  } catch {
    return new Set();
  }
}

/**
 * Everything below runs the gate. It is guarded because this module also
 * exports helpers that `scripts/__tests__/check-intent.test.ts` imports, and
 * an import that executes the check takes the whole vitest worker down with
 * it: the gate calls `process.exit(1)` on failure, which surfaces as
 * `Error: process.exit unexpectedly called with "1"` and fails every test in
 * the file — including the ones that never touched the gate.
 *
 * Same shape as `scripts/lint-changesets.ts`, which guards its own entry for
 * the same reason.
 */
const IS_ENTRYPOINT = Boolean(process.argv[1]?.endsWith('check-intent.ts'));

if (IS_ENTRYPOINT) {
  let mergeBase: string;
  let changedRaw: string;
  let addedRaw: string;
  try {
    mergeBase = git(['merge-base', BASE, 'HEAD']);
    changedRaw = git(['diff', '--name-only', `${mergeBase}...HEAD`]);
    addedRaw = git([
      'diff',
      '--name-only',
      '--diff-filter=A',
      `${mergeBase}...HEAD`,
    ]);
  } catch (error) {
    fail(`git failed: ${(error as Error).message.split('\n')[0]}`);
  }
  if (!mergeBase) fail(`No merge base between ${BASE} and HEAD.`);

  const changed = changedRaw.split('\n').filter(Boolean);
  const releaseRelevant = changed.filter(
    (f) => RELEASE_RELEVANT.test(f) && !TEST_FILE.test(f),
  );
  const changedPackages = [
    ...new Set(releaseRelevant.map((f) => f.split('/')[1])),
  ].sort();

  const addedIntents = addedRaw.split('\n').filter((f) => INTENT_FILE.test(f));

  interface Problem {
    file: string;
    kind: 'syntax' | 'section' | 'placeholder' | 'unknown-case' | 'drift';
    detail: string;
  }

  const problems: Problem[] = [];
  const declaredPackages = new Set<string>();
  const known = knownCaseIds();

  for (const file of addedIntents) {
    const full = path.join(ROOT, file);
    if (!existsSync(full)) continue;
    const { frontmatter, body, errors } = parseFrontmatter(
      readFileSync(full, 'utf8'),
    );

    for (const detail of errors)
      problems.push({ file, kind: 'syntax', detail });
    for (const pkg of frontmatter.packages) declaredPackages.add(pkg);

    for (const section of REQUIRED_SECTIONS) {
      if (!body.includes(`${section}\n`)) {
        problems.push({
          file,
          kind: 'section',
          detail: `missing \`${section}\``,
        });
      }
    }

    if (PLACEHOLDER.test(body)) {
      problems.push({
        file,
        kind: 'placeholder',
        detail:
          'contains TODO/TBD/FIXME/??? — a half-written intent looks satisfied',
      });
    }

    for (const id of frontmatter.cases) {
      if (known.size > 0 && !known.has(id)) {
        problems.push({
          file,
          kind: 'unknown-case',
          detail: `\`${id}\` is not in benchmarks/cases/registry.json`,
        });
      }
    }
  }

  /** Packages the diff touches that no added intent declared. */
  const undeclared =
    addedIntents.length === 0
      ? []
      : changedPackages.filter((pkg) => !declaredPackages.has(pkg));
  for (const pkg of undeclared) {
    problems.push({
      file: addedIntents[0],
      kind: 'drift',
      detail: `\`${pkg}\` is changed but not in any \`packages:\` list`,
    });
  }

  const status =
    releaseRelevant.length === 0
      ? 'not-needed'
      : addedIntents.length === 0
        ? 'missing'
        : problems.length > 0
          ? 'invalid'
          : 'present';

  if (JSON_OUT) {
    console.log(
      JSON.stringify(
        { status, base: mergeBase, changedPackages, addedIntents, problems },
        null,
        2,
      ),
    );
    process.exit(
      status !== 'present' && status !== 'not-needed' && STRICT ? 1 : 0,
    );
  }

  switch (status) {
    case 'not-needed':
      console.log(
        `✅ No intent needed — nothing consumer-visible changed vs ${BASE}.`,
      );
      break;

    case 'present':
      console.log(
        `✅ ${addedIntents.join(', ')} — ${changedPackages.length} changed package(s), all declared.`,
      );
      break;

    case 'missing':
      console.warn(
        `⚠️  ${changedPackages.length} package(s) changed with no intent file added on this branch:`,
      );
      console.warn('');
      for (const pkg of changedPackages) console.warn(`   - ${pkg}`);
      console.warn('');
      console.warn(
        '   Add one under `intent/` — see intent/README.md for the template.',
      );
      if (STRICT) process.exit(1);
      break;

    case 'invalid': {
      console.warn(
        `⚠️  ${problems.length} problem(s) with this branch's intent:`,
      );
      console.warn('');
      for (const p of problems)
        console.warn(`   ${p.kind.padEnd(13)} ${p.file}: ${p.detail}`);
      console.warn('');
      console.warn(
        '   `drift` means the work spread past what it said it would touch.',
      );
      console.warn(
        '   Widen `packages:` deliberately, or move the extra work to its own branch.',
      );
      if (STRICT) process.exit(1);
      break;
    }
  }

  if (!existsSync(INTENT_DIR) || readdirSync(INTENT_DIR).length === 0) {
    console.warn('   (intent/ is empty — Stage 1 has no records at all)');
  }
}
