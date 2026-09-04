#!/usr/bin/env -S npx tsx
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * prove-locks — break the thing, and check the lock notices.
 *
 * ## Why this exists
 *
 * This repository's working agreement says a fix is not done until a check
 * would have caught it, "and the check must be proven to fail on the unfixed
 * state". That proof has been a manual step: write the lock, revert the fix by
 * hand, watch it go red, put it back. Nothing recorded that it happened, and
 * nothing re-checks it later.
 *
 * Three locks written in a single day were GREEN WHILE ASSERTING NOTHING:
 *
 *   a lock on a CLI flag matched the comment that explained the flag, so
 *   deleting the flag left it passing
 *
 *   a lock on a README link matched an unrelated OG-image anchor pointing at
 *   the same URL, so both logos could point anywhere and it stayed green
 *
 *   a lock read a run artefact CI never regenerates, so it silently graded an
 *   envelope from months earlier
 *
 * Only the third was catchable by inspection — the other two passed every
 * shape-based check you could write, because the assertion was real and simply
 * matched the wrong thing. The one method that catches all three is to break
 * the subject and confirm the lock fails.
 *
 * ## The contract
 *
 * A lock declares its own proof in its doc comment, one JSON object per line:
 *
 *   @provenBy {"file":"path/to/subject","find":"exact text","replace":""}
 *
 * `find` must appear exactly once in `file` — an ambiguous mutation proves
 * nothing about which occurrence mattered. The runner applies it, runs that
 * lock alone, and requires a NON-ZERO exit. Then it restores the file.
 *
 * ## What a failure means
 *
 *   unproven   the lock declares no mutation. It may be fine; nobody has
 *              shown it. Tracked in the baseline, shrink-only.
 *   VACUOUS    the mutation applied and the lock still passed. This is the
 *              finding — the lock does not guard what it claims to.
 *   broken     the mutation could not be applied (text moved or is ambiguous).
 *              The proof is stale and says nothing until it is repaired.
 *
 *   npx tsx scripts/prove-locks.mts
 *   npx tsx scripts/prove-locks.mts --file scripts/__tests__/foo.lock.test.ts
 *   npx tsx scripts/prove-locks.mts --update   # bank a shrunken baseline
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const LOCK_DIR = path.join(ROOT, 'scripts', '__tests__');
const BASELINE = path.join(ROOT, '.agent', 'lock-proof-baseline.json');

const arg = (flag: string): string | undefined => {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  return hit?.slice(flag.length + 1);
};
const UPDATE = process.argv.includes('--update');
const ONLY = arg('--file');

type Proof = { file: string; find: string; replace: string };
type Lock = { rel: string; proofs: Proof[] };

/** Every lock test under scripts/__tests__, with whatever proofs it declares. */
function locks(): Lock[] {
  const out: Lock[] = [];
  for (const name of fs.readdirSync(LOCK_DIR).sort()) {
    if (!/lock.*\.test\.ts$/.test(name)) continue;
    const rel = path.posix.join('scripts/__tests__', name);
    if (ONLY !== undefined && !rel.endsWith(ONLY.replace(/^\.\//, '')))
      continue;
    const src = fs.readFileSync(path.join(LOCK_DIR, name), 'utf8');
    const proofs: Proof[] = [];
    for (const m of src.matchAll(/@provenBy\s+(\{.*\})\s*$/gm)) {
      try {
        proofs.push(JSON.parse(m[1]) as Proof);
      } catch {
        // A malformed declaration is reported as a broken proof below, not
        // silently skipped — a proof nobody can parse is worse than none.
        proofs.push({ file: '', find: m[1], replace: '' });
      }
    }
    out.push({ rel, proofs });
  }
  return out;
}

/** Run one lock file. True when it PASSES. */
function lockPasses(rel: string): boolean {
  try {
    execFileSync('npx', ['vitest', 'run', '--root', '.', rel], {
      cwd: ROOT,
      stdio: 'ignore',
      env: { ...process.env, CI: '1' },
    });
    return true;
  } catch {
    return false;
  }
}

const results: {
  rel: string;
  status: 'proven' | 'VACUOUS' | 'broken' | 'unproven';
  detail?: string;
}[] = [];

for (const lock of locks()) {
  if (lock.proofs.length === 0) {
    results.push({ rel: lock.rel, status: 'unproven' });
    continue;
  }

  let verdict: (typeof results)[number] = { rel: lock.rel, status: 'proven' };

  for (const proof of lock.proofs) {
    const target = path.join(ROOT, proof.file);
    if (proof.file === '' || !fs.existsSync(target)) {
      verdict = {
        rel: lock.rel,
        status: 'broken',
        detail: `subject not found: ${proof.file || '(unparseable @provenBy)'}`,
      };
      break;
    }
    const original = fs.readFileSync(target, 'utf8');
    const hits = original.split(proof.find).length - 1;
    if (hits !== 1) {
      verdict = {
        rel: lock.rel,
        status: 'broken',
        detail: `\`find\` matches ${hits}x in ${proof.file} (must be exactly 1)`,
      };
      break;
    }

    fs.writeFileSync(target, original.replace(proof.find, proof.replace));
    let stillPassing: boolean;
    try {
      stillPassing = lockPasses(lock.rel);
    } finally {
      // ALWAYS put the file back, including on Ctrl-C mid-run — a prover that
      // leaves the tree mutated is worse than no prover.
      fs.writeFileSync(target, original);
    }

    if (stillPassing) {
      verdict = {
        rel: lock.rel,
        status: 'VACUOUS',
        detail: `broke ${proof.file} and the lock still passed`,
      };
      break;
    }
  }
  results.push(verdict);
}

const by = (s: string) => results.filter((r) => r.status === s);
const vacuous = by('VACUOUS');
const broken = by('broken');
const unproven = by('unproven');
const proven = by('proven');

console.log(`\n  ${results.length} lock(s) under scripts/__tests__\n`);
console.log(
  `    proven to fail when broken   ${String(proven.length).padStart(4)}`,
);
console.log(
  `    no proof declared            ${String(unproven.length).padStart(4)}`,
);
console.log(
  `    proof stale / unapplicable   ${String(broken.length).padStart(4)}`,
);
console.log(
  `    VACUOUS                      ${String(vacuous.length).padStart(4)}`,
);

for (const v of vacuous) {
  console.error(`\n  ⛔ ${v.rel}\n     ${v.detail}`);
  console.error(
    '     The lock passed with its subject broken, so it is not guarding it.',
  );
}
for (const b of broken) {
  console.error(`\n  ⚠️  ${b.rel}\n     ${b.detail}`);
}

/*
 * The ratchet. `unproven` is debt: shrink-only, never allowed to grow, which
 * makes a NEW lock arrive with a proof without demanding all 61 at once.
 */
type Baseline = { command: string; note: string; unproven: string[] };
const previous: Baseline = fs.existsSync(BASELINE)
  ? (JSON.parse(fs.readFileSync(BASELINE, 'utf8')) as Baseline)
  : { command: '', note: '', unproven: [] };

const now = unproven.map((u) => u.rel).sort();
const known = new Set(previous.unproven ?? []);
const added = ONLY === undefined ? now.filter((r) => !known.has(r)) : [];
const fixed =
  ONLY === undefined ? [...known].filter((r) => !now.includes(r)) : [];

if (UPDATE) {
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(
    BASELINE,
    `${JSON.stringify(
      {
        command: 'npx tsx scripts/prove-locks.mts --update',
        note:
          'Lock tests with no @provenBy declaration. Shrink-only: a new lock ' +
          'must arrive with a proof that it fails when its subject breaks. ' +
          'See scripts/prove-locks.mts.',
        unproven: now,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `\n  baseline written: ${previous.unproven.length} → ${now.length}`,
  );
} else if (added.length > 0) {
  console.error(
    `\n  ⛔ ${added.length} lock(s) added with no @provenBy proof:\n` +
      added.map((a) => `     ${a}`).join('\n') +
      '\n\n  A lock nobody has broken is a lock nobody has tested. Declare the' +
      '\n  mutation that must make it fail:' +
      '\n\n     @provenBy {"file":"<subject>","find":"<exact text>","replace":""}',
  );
} else if (fixed.length > 0) {
  console.log(
    `\n  ✓ ${fixed.length} lock(s) gained a proof — run with --update to bank it.`,
  );
}

process.exit(
  vacuous.length > 0 || broken.length > 0 || added.length > 0 ? 1 : 0,
);
