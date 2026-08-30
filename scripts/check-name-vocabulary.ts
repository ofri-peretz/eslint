/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A rule that decides from an identifier NAME must let the consumer own the
 * vocabulary — and own it by REPLACEMENT, not only by addition.
 *
 * ## Why
 *
 * The space of names a project might use is endless. `isAuthorized`,
 * `hasAccess`, `canEdit`, `gate`, `guard` — a fixed list guesses at somebody
 * else's conventions and is wrong in both directions at once: the codebase that
 * calls its CSRF value `nonce` is missed, and the one whose `keyHandler` is a
 * keyboard handler is flagged. Neither project can do anything about it.
 *
 * An ADDITIVE option is not enough. `additionalSensitiveProperties` grows the
 * list; it cannot remove the word we guessed wrong about, so the project with
 * the keyboard handler can add forever and never stop the report. The option
 * has to be able to replace.
 *
 * ## The exception this does not cover
 *
 * Matching a STANDARD API name is a different thing and is fine hardcoded:
 * `dangerouslyAllowBrowser` is Anthropic's, `safetySettings` is Gemini's,
 * `rejectUnauthorized` is Node's. Those are vocabularies the library defines,
 * not names a consumer chose, and they change only when the library changes.
 * This gate is about the other kind.
 *
 * ## What it checks
 *
 * `makeNameTest` and `identifierWords` are how a rule in this suite reads an
 * identifier's name. Any rule importing either must expose an option whose name
 * says it carries a vocabulary — `*Words`, `*Names`, `*Patterns`, `*Terms` —
 * and that option must not be additive-only.
 *
 * Shrink-only baseline, like the other ratchets here.
 *
 *   npx tsx scripts/check-name-vocabulary.ts
 *   npx tsx scripts/check-name-vocabulary.ts --update
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { readBaseline } from './lib/read-baseline.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BASELINE = path.join(ROOT, 'benchmarks', 'budgets', 'name-vocabulary-baseline.json');
const UPDATE = process.argv.includes('--update');

/** The helpers that read an identifier's name. */
const NAME_HELPERS = ['makeNameTest', 'identifierWords'];

/** An option name that carries a vocabulary rather than a flag or a number. */
const VOCABULARY = /(words|names|patterns|terms|properties|vocabulary)$/i;

/** Additive-only: can grow the list, cannot remove what we guessed wrong. */
const ADDITIVE = /^(additional|extra|custom|more)/i;

function ruleModules(): { rule: string; file: string }[] {
  const out: { rule: string; file: string }[] = [];
  const pkgDir = path.join(ROOT, 'packages');
  for (const pkg of fs.readdirSync(pkgDir).filter((d) => d.startsWith('eslint-plugin-'))) {
    const rulesDir = path.join(pkgDir, pkg, 'src', 'rules');
    if (!fs.existsSync(rulesDir)) continue;
    const plugin = pkg.replace('eslint-plugin-', '');
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (fs.existsSync(path.join(full, 'index.ts'))) {
            out.push({ rule: `${plugin}/${entry.name}`, file: path.join(full, 'index.ts') });
          }
          walk(full);
        } else if (entry.name.endsWith('.ts') && !/\.(test|spec)\./.test(entry.name) && entry.name !== 'index.ts') {
          out.push({ rule: `${plugin}/${entry.name.replace(/\.ts$/, '')}`, file: full });
        }
      }
    };
    walk(rulesDir);
  }
  return out.sort((a, b) => a.rule.localeCompare(b.rule));
}

/** Option names declared in the rule's `meta.schema`. */
function schemaOptions(source: ts.SourceFile): string[] {
  const keys: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'properties' &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      for (const property of node.initializer.properties) {
        if (ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) {
          keys.push(property.name.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return keys;
}

const offenders: string[] = [];
const compliant: string[] = [];

for (const { rule, file } of ruleModules()) {
  const text = fs.readFileSync(file, 'utf8');
  if (!NAME_HELPERS.some((helper) => text.includes(helper))) continue;

  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const options = schemaOptions(source);
  const replaceable = options.filter((name) => VOCABULARY.test(name) && !ADDITIVE.test(name));
  if (replaceable.length > 0) compliant.push(rule);
  else offenders.push(rule);
}

console.log(`  rules deciding by identifier name   ${compliant.length + offenders.length}`);
console.log(`  vocabulary the consumer can replace ${compliant.length}`);
console.log(`  hardcoded, no way to replace        ${offenders.length}`);

const baseline = readBaseline(BASELINE, 'rules');

if (UPDATE) {
  const grew = offenders.filter((rule) => !baseline.includes(rule));
  if (baseline.length > 0 && grew.length > 0) {
    console.error(`\n  ⛔ refusing to grow the baseline by ${grew.length}: ${grew.join(', ')}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(
    BASELINE,
    `${JSON.stringify(
      {
        note: 'Rules that decide from an identifier name with no option to REPLACE the vocabulary. Shrink-only.',
        rules: offenders.sort(),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`  baseline written: ${baseline.length} → ${offenders.length}`);
  process.exit(0);
}

const known = new Set(baseline);
const regressed = offenders.filter((rule) => !known.has(rule));
if (regressed.length > 0) {
  console.error(`\n  ⛔ ${regressed.length} rule(s) read an identifier name with no vocabulary option:`);
  for (const rule of regressed) console.error(`     ${rule}`);
  console.error(
    '\n  Add an option that REPLACES the list (not an `additional*` one), or stop\n' +
      '  deciding from the name. A standard SDK API name is a different thing and\n' +
      '  does not belong behind an option — see this file’s header.',
  );
  process.exit(1);
}
console.log(`  baseline ${baseline.length} — no regression`);
