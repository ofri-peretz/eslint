/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * An inline list of PROPERTY names, compared against a key, with no option.
 *
 * `check-name-vocabulary.ts` covers rules that read an IDENTIFIER's name
 * through `makeNameTest` / `identifierWords`. This covers the hole beside it:
 * a rule that writes the list inline and tests it against `key.name` or
 * `property.name` never imports either helper, so that gate never sees it.
 *
 * That hole shipped a real defect. `require-data-minimization` decided what
 * counts as personal data with:
 *
 *     ['email', 'name', 'phone', 'address'].includes(p.key.name)
 *
 * and `schema: []`. A project whose fields are `emailAddress`, `mobile` and
 * `billingLine1` got nothing and could do nothing about it.
 *
 * ## The test that decides it
 *
 * **Who defines this name?**
 *
 *   Somebody else  -> hard-code it. `innerHTML` is WHATWG's, `alg` is RFC
 *                     7519's, `allocUnsafe` is Node's, `PureComponent` is
 *                     React's. They change when the standard changes, not when
 *                     a consumer renames a field.
 *   Our consumer   -> it belongs in an option that REPLACES the default.
 *                     `email`, `maxSize`, `entryName` are all in this bucket:
 *                     they are guesses at somebody's schema, config or
 *                     dependency list.
 *
 * A site in the first bucket declares itself with a `@vocabulary` comment
 * naming the authority. That costs one line, which is the point: cheap to
 * justify, impossible to do by accident.
 *
 *     // @vocabulary Node Buffer API
 *     ['from', 'alloc', 'allocUnsafe'].includes(callee.property.name)
 *
 * Shrink-only baseline, like the other ratchets here.
 *
 *   npx tsx scripts/check-key-vocabulary.ts
 *   npx tsx scripts/check-key-vocabulary.ts --check
 *   npx tsx scripts/check-key-vocabulary.ts --update
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBaseline } from './lib/read-baseline.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BASELINE = path.join(
  ROOT,
  'benchmarks',
  'budgets',
  'key-vocabulary-baseline.json',
);

const CHECK = process.argv.includes('--check');
const UPDATE = process.argv.includes('--update');

/** An inline literal list tested against a property or object-key name. */
const INLINE_LIST =
  /\[\s*'[^']+'(?:\s*,\s*'[^']+')+\s*\]\s*\.(?:includes|indexOf)\s*\(/;
const AGAINST_KEY = /key\.name|property\.name|objectKeyName\(|propertyName\(/;
/** The one-line declaration that this list is somebody else's vocabulary. */
const JUSTIFIED = /@vocabulary\s+\S/;

type Site = { file: string; line: number; text: string };

function ruleSources(): string[] {
  const out: string[] = [];
  const packages = path.join(ROOT, 'packages');
  for (const pkg of fs.readdirSync(packages)) {
    if (!pkg.startsWith('eslint-plugin-')) continue;
    const src = path.join(packages, pkg, 'src');
    if (!fs.existsSync(src)) continue;
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith('.ts')) continue;
        if (/\.(test|spec)\.ts$/.test(entry.name)) continue;
        if (full.includes(`${path.sep}tests${path.sep}`)) continue;
        out.push(full);
      }
    };
    walk(src);
  }
  return out.sort();
}

const sites: Site[] = [];
for (const file of ruleSources()) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((text, index) => {
    if (!INLINE_LIST.test(text) || !AGAINST_KEY.test(text)) return;
    // The justification may sit on the line or in the three above it, which is
    // where a comment naturally goes.
    const window = lines.slice(Math.max(0, index - 3), index + 1).join('\n');
    if (JUSTIFIED.test(window)) return;
    sites.push({
      file: path.relative(ROOT, file),
      line: index + 1,
      text: text.trim().slice(0, 96),
    });
  });
}

const key = (s: Site): string => `${s.file}::${s.text}`;
const current = sites.map(key).sort();
const previous = readBaseline(BASELINE, 'sites');
const known = new Set(previous);
const added = sites.filter((s) => !known.has(key(s)));

console.log(`\n  ${sites.length} unjustified inline key-vocabulary site(s)`);
console.log(`  baseline ${previous.length} · NEW ${added.length}`);

if (added.length > 0) {
  console.error(
    '\n  ⛔ new inline key vocabulary with no option and no justification:\n',
  );
  for (const s of added.slice(0, 15)) {
    console.error(`     ${s.file}:${s.line}`);
    console.error(`       ${s.text}\n`);
  }
  if (added.length > 15)
    console.error(`     … and ${added.length - 15} more\n`);
  console.error(
    '  Ask who defines these names.\n' +
      '    Somebody else (WHATWG, RFC, Node, React, an SDK) — say so in a comment:\n' +
      '        // @vocabulary Node Buffer API\n' +
      '    Our consumer (their schema, their config, their dependency list) — give\n' +
      '    them an option that REPLACES the default, not an `additional*` one.\n',
  );
}

if (CHECK) {
  if (added.length > 0) process.exit(1);
  console.log('  no new unjustified key vocabulary\n');
} else if (UPDATE || previous.length === 0) {
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(
    BASELINE,
    `${JSON.stringify(
      {
        note: 'Inline property-name lists with no vocabulary option and no `@vocabulary` justification. Shrink-only: a NEW one fails the gate.',
        sites: current,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`  baseline: ${previous.length} → ${current.length}\n`);
}
