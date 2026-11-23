/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The two test-integrity checks a lint rule cannot make, because they are
 * about what a change did rather than what a file says: an assertion moved to
 * a weaker matcher, and a snapshot rewritten with no reason given.
 *
 * Both read only changed lines (a unified diff with `--unified=0`) and the
 * commit messages of the range — never a whole file.
 */

/**
 * One finding's text, in the shape the lint rules' messages take — issue,
 * what happened, the fix — without importing the devkit, so the bin runs
 * from source (`tsx src/diff/cli.ts`) before anything is built.
 */
function message(issue: string, description: string, fix: string): string {
  return `🧪 ${issue}: ${description}. Fix: ${fix} | ${DOCS}`;
}

const DOCS =
  'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-test-integrity/README.md#diff-checks';

export interface ChangedLine {
  line: number;
  text: string;
}

export interface Hunk {
  removed: ChangedLine[];
  added: ChangedLine[];
}

export interface FileDiff {
  path: string;
  hunks: Hunk[];
}

export interface Finding {
  check: 'weakened-assertion' | 'unexplained-snapshot';
  path: string;
  line: number;
  message: string;
}

const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/** Parse `git diff --unified=0` output into files and hunks. */
export function parseUnifiedDiff(diff: string): FileDiff[] {
  const files: FileDiff[] = [];
  let file: FileDiff | undefined;
  let hunk: Hunk | undefined;
  let oldLine = 0;
  let newLine = 0;
  for (const raw of diff.split('\n')) {
    if (raw.startsWith('diff --git ')) {
      file = undefined;
      hunk = undefined;
      continue;
    }
    if (raw.startsWith('+++ ')) {
      const target = raw.slice(4);
      if (target === '/dev/null') continue;
      file = { path: target.replace(/^b\//, ''), hunks: [] };
      files.push(file);
      continue;
    }
    if (raw.startsWith('--- ')) continue;
    const header = HUNK_HEADER.exec(raw);
    if (header) {
      if (!file) continue;
      hunk = { removed: [], added: [] };
      file.hunks.push(hunk);
      oldLine = Number(header[1]);
      newLine = Number(header[2]);
      continue;
    }
    if (!hunk) continue;
    if (raw.startsWith('-')) {
      hunk.removed.push({ line: oldLine++, text: raw.slice(1) });
    } else if (raw.startsWith('+')) {
      hunk.added.push({ line: newLine++, text: raw.slice(1) });
    }
  }
  return files;
}

/**
 * Strictness, strongest first. A change that moves an assertion on the same
 * subject to a lower rank accepts more wrong answers than it did.
 */
export const MATCHER_RANK: Readonly<Record<string, number>> = {
  toBe: 4,
  toStrictEqual: 4,
  toEqual: 3,
  toMatchObject: 2,
  toBeTruthy: 1,
  toBeDefined: 1,
};

const ASSERTION = /expect\(\s*(.+?)\s*\)\s*\.\s*(not\s*\.\s*)?(\w+)\s*\(/g;

interface Assertion {
  subject: string;
  matcher: string;
  line: number;
}

function assertions(lines: ChangedLine[]): Assertion[] {
  const found: Assertion[] = [];
  for (const { line, text } of lines) {
    for (const match of text.matchAll(ASSERTION)) {
      // `.not.toBe` is a different claim, not a weaker one.
      if (match[2]) continue;
      const matcher = match[3];
      if (!(matcher in MATCHER_RANK)) continue;
      found.push({ subject: match[1].replace(/\s+/g, ''), matcher, line });
    }
  }
  return found;
}

const ASSERTION_REASON = /^Assertion:\s*\S/im;

/**
 * Assertions on the same subject that moved to a weaker matcher. An
 * `Assertion: <why>` line in one of the range's commit messages accepts them.
 */
export function weakenedAssertions(
  files: FileDiff[],
  commitMessages = '',
): Finding[] {
  if (ASSERTION_REASON.test(commitMessages)) return [];
  const findings: Finding[] = [];
  for (const file of files) {
    for (const hunk of file.hunks) {
      const before = assertions(hunk.removed);
      for (const after of assertions(hunk.added)) {
        const old = before.find((b) => b.subject === after.subject);
        if (!old) continue;
        if (MATCHER_RANK[after.matcher] >= MATCHER_RANK[old.matcher]) continue;
        findings.push({
          check: 'weakened-assertion',
          path: file.path,
          line: after.line,
          message: message(
            'Weakened Assertion',
            `expect(${after.subject}) moved from .${old.matcher}() to the weaker .${after.matcher}() in this change`,
            `Keep the strict matcher and fix the code, or assert the new exact value with .${old.matcher}(). If the looser claim is intended, add an "Assertion: <why>" line to the commit message.`,
          ),
        });
      }
    }
  }
  return findings;
}

const SNAPSHOT_FILE = /\.snap$|(?:^|\/)__snapshots__\//;
const SNAPSHOT_REASON = /^Snapshot:\s*\S/im;

/**
 * A changed snapshot needs a `Snapshot: <reason>` line in one of the range's
 * commit messages — updating a snapshot is how a wrong output becomes the
 * expected one, so the change has to say what it accepts.
 */
export function unexplainedSnapshots(
  changedPaths: string[],
  commitMessages: string,
): Finding[] {
  if (SNAPSHOT_REASON.test(commitMessages)) return [];
  return changedPaths
    .filter((p) => SNAPSHOT_FILE.test(p))
    .map((path) => ({
      check: 'unexplained-snapshot' as const,
      path,
      line: 1,
      message: message(
        'Unexplained Snapshot Update',
        'A snapshot changed and no commit in the range says why the new output is correct',
        'Add a "Snapshot: <what changed and why it is right>" line to the commit message, or revert the snapshot and fix the code.',
      ),
    }));
}
