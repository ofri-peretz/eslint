/**
 * Positive control for node-security/lock-file.
 *
 * A QUIET probe proves nothing without a positive control: this first proves
 * the rule DOES report in a project with no lock file, then changes exactly one
 * thing (the lock file appears) and re-checks. Finally it reproduces what the
 * duel harness does — pass `path.basename(file)` as the filename — to show why
 * the harness cannot exercise the rule at all.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Linter } from 'eslint';

import { lockFile } from '/Users/ofri/repos/ofriperetz.dev/eslint-perfection/packages/eslint-plugin-node-security/src/rules/lock-file/index.ts';

/**
 * A fresh `Linter` per project root, because flat config only matches files
 * UNDER its cwd. The first draft of this probe used one cwd-less Linter and
 * every call came back with a single message reading "No matching
 * configuration found", `ruleId: null` — and counting messages scored that as
 * a finding. A config error read as a detection, in a probe whose entire job
 * is to tell reporting from silence. Only messages carrying a `ruleId` count,
 * and anything else is now thrown rather than counted.
 *
 * The rule's `reportedRoots` set is module scope, so it still persists across
 * these linters — which is the point of case 2.
 */
const run = (code: string, filename: string, cwd: string): number => {
  const messages = new Linter({ cwd }).verify(
    code,
    {
      languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
      plugins: { ours: { rules: { 'lock-file': lockFile as never } } },
      rules: { 'ours/lock-file': 'error' },
    },
    filename,
  );
  const unattributed = messages.filter((m) => !m.ruleId);
  if (unattributed.length > 0) throw new Error(`harness error: ${unattributed[0].message}`);
  return messages.length;
};

const CODE = "import express from 'express';\nexport default express();\n";

// 1. POSITIVE CONTROL — a real project directory with a package.json and no lock file.
const noLock = fs.mkdtempSync(path.join(os.tmpdir(), 'lf-nolock-'));
fs.writeFileSync(path.join(noLock, 'package.json'), '{"name":"probe"}');
fs.mkdirSync(path.join(noLock, 'src'));
console.log('1. no lock file, real path       ->', run(CODE, path.join(noLock, 'src', 'server.js'), noLock), 'report(s)');

// 2. Same project, SECOND file — the module-level dedupe set has already seen this root.
console.log('2. no lock file, 2nd file        ->', run(CODE, path.join(noLock, 'src', 'other.js'), noLock), 'report(s)');

// 3. The FILE CONTENT is never read: an empty file in a fresh no-lock project.
const noLock2 = fs.mkdtempSync(path.join(os.tmpdir(), 'lf-nolock2-'));
fs.writeFileSync(path.join(noLock2, 'package.json'), '{"name":"probe"}');
console.log('3. no lock file, EMPTY file      ->', run('', path.join(noLock2, 'empty.js'), noLock2), 'report(s)');

// 4. Change exactly one thing: the lock file appears.
const withLock = fs.mkdtempSync(path.join(os.tmpdir(), 'lf-withlock-'));
fs.writeFileSync(path.join(withLock, 'package.json'), '{"name":"probe"}');
fs.writeFileSync(path.join(withLock, 'package-lock.json'), '{"lockfileVersion":3}');
console.log('4. lock file present, real path  ->', run(CODE, path.join(withLock, 'server.js'), withLock), 'report(s)');

// 5. No package.json anywhere above: not a JS project. (tmpdir has no manifest above it.)
const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'lf-bare-'));
console.log('5. no manifest at all            ->', run(CODE, path.join(bare, 'loose.js'), bare), 'report(s)');

// 6. WHAT THE DUEL HARNESS DOES — `path.basename(file)`, so the walk starts at cwd.
console.log('6. harness filename (basename)   ->', run(CODE, '01-no-lock-file.js', process.cwd()), 'report(s)');
console.log('   cwd                           =', process.cwd());
console.log('   cwd has package-lock.json     =', fs.existsSync(path.join(process.cwd(), 'package-lock.json')));
