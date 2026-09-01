/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * add-sourced-fixture.mts — cut a corpus fixture OUT OF somebody else's code.
 *
 * ## Why this is a script and not a convention
 *
 * `check-corpus-coverage.ts` published, for months, a number called
 * INDEPENDENT that was computed from the DIRECTORY a fixture sat in. Every
 * fixture in those directories was written here — 85 by an AI in this project,
 * 48 by the author of the rules — and the headline said 68 rules had their
 * precision measured against code their author did not write. The true figure
 * was zero.
 *
 * A convention would not have prevented that, because the convention was
 * already written down in the intent and the gate still measured the path. So
 * provenance is mechanical here: this script is the only way a fixture gets
 * created, it copies the bytes out of a clone rather than retyping them, and
 * it stamps the commit it took them from. A fixture with no `@source` is not
 * counted, and a `@source` that does not pin a sha is rejected by
 * `corpus-independence-is-provenance.test.ts`.
 *
 * ## What it deliberately does NOT do
 *
 * It does not run the rule. Ground truth is labelled BEFORE the rule sees the
 * code — that is the whole difference between a measurement and a rubber
 * stamp, and a fixture adjusted afterwards to make a number look better
 * measures nothing. `--expected` is your claim about the code, made first.
 *
 *   npx tsx scripts/add-sourced-fixture.mts \
 *     --repo DataDog/browser-sdk --path packages/core/src/tools/utils.ts \
 *     --lines 40-58 --cwe CWE-1333 --expected vulnerable \
 *     --slug catastrophic-backtracking-in-url-parser \
 *     --why "the anchor is unbounded and the input is a URL off the wire"
 */

import { execFileSync } from 'node:child_process';
import { parse } from '@typescript-eslint/typescript-estree';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CACHE = path.join(ROOT, 'benchmarks', '.real-source-cache');

function arg(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

function die(message: string): never {
  console.error(`\n  ⛔ ${message}\n`);
  process.exit(1);
}

const repo = arg('repo') ?? die('--repo owner/name is required');
const relPath = arg('path') ?? die('--path <path inside the repo> is required');
const lines = arg('lines') ?? die('--lines <start>-<end> is required');
const cwe = arg('cwe') ?? die('--cwe CWE-NNN is required');
const expected = arg('expected') ?? die('--expected vulnerable|safe is required');
const slug = arg('slug') ?? die('--slug <kebab-case-name> is required');
const why = arg('why') ?? die('--why "<one line: what makes it this label>" is required');
const sealed = arg('sealed');

if (expected !== 'vulnerable' && expected !== 'safe') {
  die('--expected must be exactly `vulnerable` or `safe`');
}
if (!/^CWE-\d{3,4}$/.test(cwe)) die(`--cwe must look like CWE-089, got ${cwe}`);
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) die(`--slug must be kebab-case, got ${slug}`);

const clone = path.join(CACHE, repo.replace('/', '__'));
if (!fs.existsSync(clone)) {
  die(
    `no clone at ${path.relative(ROOT, clone)}.\n` +
      '  Add the repository to benchmarks/real-source-repos.json and run:\n' +
      '    npx tsx scripts/real-source-scan.mts',
  );
}

const source = path.join(clone, relPath);
if (!fs.existsSync(source)) die(`${relPath} does not exist in ${repo}`);

/** The commit the bytes actually came from, so the claim can be checked. */
const sha = execFileSync('git', ['-C', clone, 'rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();

const [start, end] = lines.split('-').map(Number);
if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
  die(`--lines must be <start>-<end> with 1 <= start <= end, got ${lines}`);
}

const all = fs.readFileSync(source, 'utf8').split('\n');
if (end > all.length) die(`${relPath} has ${all.length} lines, --lines asked for ${end}`);
const snippet = all.slice(start - 1, end).join('\n').replace(/\s+$/, '');

const header = [
  `// ${cwe}: ${expected} — ${why}`,
  '// @author        (not ours — see @source)',
  '// @reviewedBy    benchmark-validator',
  `// @lastReviewed  ${new Date().toISOString().slice(0, 10)}`,
  `// @source        ${repo}@${sha} ${relPath}:${start}`,
  ...(sealed === null ? [] : [`// @sealed        ${sealed}`]),
  `// @expected      ${expected}`,
  expected === 'vulnerable' ? '// This MUST be flagged' : '// This MUST NOT be flagged',
  '',
].join('\n');

/*
 * A snippet that does not parse measures nothing, and it fails QUIETLY: ESLint
 * reports the parse error and no rule runs, so the fixture sits in the corpus
 * proving that the rule it was sealed for did not fire. The first fixture cut
 * with this script was `if (…) { … } else {` — the closing brace of the block
 * shares a line with the `else` — and it went in unnoticed.
 */
try {
  parse(snippet, { ecmaVersion: 2022, sourceType: 'module', jsx: true });
} catch (error) {
  die(
    `lines ${start}-${end} of ${relPath} do not parse on their own:\n` +
      `     ${(error as Error).message.split('\n')[0]}\n` +
      '  Widen or narrow the range to a self-contained construct — a whole\n' +
      '  function or a whole statement. A snippet that cannot parse runs no\n' +
      '  rules, and would sit in the corpus looking like a missed detection.',
  );
}

const dir = path.join(ROOT, 'benchmarks', 'corpus', cwe, expected);
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, `${slug}.js`);
if (fs.existsSync(out)) die(`${path.relative(ROOT, out)} already exists`);
fs.writeFileSync(out, `${header}${snippet}\n`);

console.log(
  `\n  ✅ ${path.relative(ROOT, out)}` +
    `\n     ${repo}@${sha.slice(0, 12)} ${relPath}:${start}-${end}` +
    '\n\n  The label is your claim, made before the rule ran. Do not edit it' +
    '\n  after seeing what the rule says.\n',
);
