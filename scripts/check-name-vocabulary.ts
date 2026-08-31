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
 *   npx tsx scripts/check-name-vocabulary.ts --list
 */

import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { readBaseline } from './lib/read-baseline.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BASELINE = path.join(
  ROOT,
  'benchmarks',
  'budgets',
  'name-vocabulary-baseline.json',
);
const UPDATE = process.argv.includes('--update');
/** Print the offenders. The counts alone say a number is wrong, not where. */
const LIST = process.argv.includes('--list');

/** The helpers that read an identifier's name. */
/**
 * The empirical answer to "does this rule decide from a name".
 *
 * This gate used to grep each rule for `makeNameTest` / `identifierWords` and
 * `continue` past everything else. Of the 25 most name-dependent rules in the
 * suite, THREE import those helpers and 22 do not — so the gate skipped almost
 * everything it existed to check, and its reported `0` meant "no rule using the
 * helpers lacks an option", which reads like a much stronger claim than it is.
 *
 * A second static pattern would not have fixed it. `check:key-vocabulary`
 * already covers inline property-name lists, and an open-coded `n === 'secret'`
 * can be written a dozen ways. The probe settles it by experiment instead: it
 * renames every local binding to `foo1, foo2, …` and re-runs the suites, so a
 * rule whose verdict changes DID decide from a name. That is the litmus in
 * CASE_PHILOSOPHY.md, mechanised.
 *
 * The probe takes minutes, which is not a per-PR cost, so it commits its
 * conclusion here and this gate reads it.
 */
const ARTIFACT = path.join(
  ROOT,
  'benchmarks',
  'budgets',
  'name-dependence.json',
);

/** `scripts/name-dependence-probe.mts`, whose hash the artifact records. */
const PROBE = path.join(ROOT, 'scripts', 'name-dependence-probe.mts');

/**
 * A rule may hardcode a name it did not choose, if it says whose it is.
 *
 * `dangerouslyAllowBrowser` is Anthropic's, `rejectUnauthorized` is Node's.
 * Those are published contracts, not guesses at a consumer's conventions, and
 * they change only when the library does. The citation is the difference
 * between a fact and an assumption.
 */
const CITATION = '@vocabulary';

/*
 * What this gate cannot tell apart, stated so nobody mistakes it for more.
 *
 * It asks "does this rule expose SOME replaceable vocabulary option", not
 * "does it expose one for the vocabulary it actually decided from". A rule with
 * `placeholderWords` and a second, hardcoded list passes — found by sabotage:
 * renaming `credentialWords` out of `no-hardcoded-credentials` left it
 * compliant, because `placeholderWords` still matched.
 *
 * Closing that needs a map from each option to the names it governs, which is
 * a dataflow question and not obviously worth its cost. The gate is a floor —
 * a rule with NO replaceable vocabulary at all cannot pass — and the floor is
 * where the 32 currently baselined rules sit. It is not a certificate.
 *
 * The same applies to the citation: one `@vocabulary` comment exempts the whole
 * file, not the specific list it sits above.
 */

/** An option name that carries a vocabulary rather than a flag or a number. */
const VOCABULARY = /(words|names|patterns|terms|properties|vocabulary)$/i;

/** Additive-only: can grow the list, cannot remove what we guessed wrong. */
const ADDITIVE = /^(additional|extra|custom|more)/i;

function ruleModules(): { rule: string; file: string }[] {
  const out: { rule: string; file: string }[] = [];
  const pkgDir = path.join(ROOT, 'packages');
  for (const pkg of fs
    .readdirSync(pkgDir)
    .filter((d) => d.startsWith('eslint-plugin-'))) {
    const rulesDir = path.join(pkgDir, pkg, 'src', 'rules');
    if (!fs.existsSync(rulesDir)) continue;
    const plugin = pkg.replace('eslint-plugin-', '');
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (fs.existsSync(path.join(full, 'index.ts'))) {
            out.push({
              rule: `${plugin}/${entry.name}`,
              file: path.join(full, 'index.ts'),
            });
          }
          walk(full);
        } else if (
          entry.name.endsWith('.ts') &&
          !/\.(test|spec)\./.test(entry.name) &&
          entry.name !== 'index.ts'
        ) {
          out.push({
            rule: `${plugin}/${entry.name.replace(/\.ts$/, '')}`,
            file: full,
          });
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
        if (
          ts.isPropertyAssignment(property) &&
          (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
        ) {
          keys.push(property.name.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return keys;
}

/**
 * Refuse to report a number we cannot vouch for.
 *
 * `real-world-rule-inventory.json` carried the right date and the wrong
 * instrument for four days, and "270 rules never fire" was read as a fact about
 * the rules when seven plugins had never been run. An artifact that cannot say
 * what produced it is eventually believed about something it never measured.
 */
let artifact: { probeStamp?: string; rules?: Record<string, number> };
try {
  artifact = JSON.parse(fs.readFileSync(ARTIFACT, 'utf8')) as typeof artifact;
} catch {
  console.error(
    `\n  ⛔ ${path.relative(ROOT, ARTIFACT)} is missing.` +
      '\n  Run: npx tsx scripts/name-dependence-probe.mts',
  );
  process.exit(1);
}

const currentStamp = createHash('sha256')
  .update(fs.readFileSync(PROBE))
  .digest('hex')
  .slice(0, 16);

if (artifact.probeStamp !== currentStamp) {
  console.error(
    `\n  ⛔ ${path.relative(ROOT, ARTIFACT)} was produced by a different probe` +
      `\n     (recorded ${artifact.probeStamp ?? 'nothing'}, current ${currentStamp}).` +
      '\n  The rules it lists may no longer be the rules that decide from a name.' +
      '\n  Run: npx tsx scripts/name-dependence-probe.mts',
  );
  process.exit(1);
}

const nameDependent = new Set(Object.keys(artifact.rules ?? {}));

const offenders: string[] = [];
const compliant: string[] = [];

for (const { rule, file } of ruleModules()) {
  if (!nameDependent.has(rule)) continue;

  const text = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const options = schemaOptions(source);
  const replaceable = options.filter(
    (name) => VOCABULARY.test(name) && !ADDITIVE.test(name),
  );
  if (replaceable.length > 0 || text.includes(CITATION)) compliant.push(rule);
  else offenders.push(rule);
}

/** In the artifact but not on disk — renamed or deleted since the probe ran. */
const vanished = [...nameDependent].filter(
  (rule) => !ruleModules().some((m) => m.rule === rule),
);

console.log(
  `  rules deciding by identifier name   ${compliant.length + offenders.length}  (probe: ${nameDependent.size})`,
);
console.log(`  replaceable option or citation      ${compliant.length}`);
console.log(`  hardcoded, no way to replace        ${offenders.length}`);
if (LIST) {
  for (const rule of offenders.sort()) console.log(`    ${rule}`);
}
if (vanished.length > 0) {
  console.log(
    `  in the artifact but not on disk     ${vanished.length}  — re-run the probe`,
  );
}

const baseline = readBaseline(BASELINE, 'rules');

if (UPDATE) {
  const grew = offenders.filter((rule) => !baseline.includes(rule));
  if (baseline.length > 0 && grew.length > 0) {
    console.error(
      `\n  ⛔ refusing to grow the baseline by ${grew.length}: ${grew.join(', ')}`,
    );
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
  console.error(
    `\n  ⛔ ${regressed.length} rule(s) read an identifier name with no vocabulary option:`,
  );
  for (const rule of regressed) console.error(`     ${rule}`);
  console.error(
    '\n  Add an option that REPLACES the list (not an `additional*` one), or stop\n' +
      '  deciding from the name. A standard SDK API name is a different thing and\n' +
      '  does not belong behind an option — see this file’s header.',
  );
  process.exit(1);
}
console.log(`  baseline ${baseline.length} — no regression`);
