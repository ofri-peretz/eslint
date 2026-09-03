#!/usr/bin/env -S npx tsx

/**
 * check-format-drift.ts — no file may BECOME unformatted.
 *
 * ## The hole this closes
 *
 * `CLAUDE.md` lists `✅ Prettier (format check)` among the required checks on
 * every PR. There is no such check. Prettier appears in no workflow and in no
 * lefthook hook — it is a devDependency that people happen to run. Measured on
 * `main`: 3,613 source files we own are not prettier-clean, and nothing in the
 * repository would have told anyone.
 *
 * That is the failure this codebase keeps finding in itself: a control that is
 * documented as enforced, believed to be enforced, and enforcing nothing. It
 * cost real review time this quarter — twice, a formatting pass caught by a
 * wide glob put 34 and 35 unrelated files into a diff, and both times the only
 * way to tell "my change" from "prettier finally reached this file" was to
 * check each against `origin/main` by hand.
 *
 * ## Why a ratchet and not `prettier --write`
 *
 * Reformatting 3,613 files is one commit that rewrites `git blame` across most
 * of the repository and conflicts with every branch in flight — around ten
 * worktrees are active here on any given day. It would buy nothing a ratchet
 * does not: the files are not WRONG, they are formatted to an older prettier
 * or by hand, and no bug has ever come from that.
 *
 * What does cause harm is DRIFT — a file that was clean becoming unclean, and
 * unrelated reformatting riding along in a diff. So the existing set is
 * baselined and only new entries fail, exactly like `check:spellings`,
 * `check:computed-keys` and the description ratchet. The debt shrinks whenever
 * somebody formats a file they were editing anyway, and `--update` records
 * that. It can never grow.
 *
 * ## What is deliberately out of scope
 *
 * Vendored corpus (`benchmarks/corpus/**`, suite workspaces) is third-party
 * source: formatting it would change the very text the benchmarks measure.
 * Generated output (`benchmark-results/**`) is rewritten by its producer, and
 * a formatter and an emitter fighting over one file is a loop, not a gate —
 * `.prettierignore` already carries `benchmarks/corpus-index.json` for exactly
 * that reason.
 *
 * ## Two modes, because a full pass costs 76s
 *
 * With no file arguments it scans the repository — that is the CI job, and it
 * is the only run that can notice a file leaving the baseline.
 *
 * With file arguments it checks only those, which is what the pre-commit hook
 * passes. 76 seconds on every commit would get the hook disabled within a
 * week, and the question at commit time is only ever "did I just make one of
 * MY files unclean".
 *
 *   npx tsx scripts/check-format-drift.ts               # whole repo (CI)
 *   npx tsx scripts/check-format-drift.ts a.ts b.ts     # just these (hook)
 *   npx tsx scripts/check-format-drift.ts --update      # after formatting some
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BASELINE = path.join(ROOT, '.agent', 'format-drift-baseline.json');
const UPDATE = process.argv.includes('--update');
/** Explicit paths to check, or none for a full-repository scan. */
const ONLY = process.argv
  .slice(2)
  .filter((a) => !a.startsWith('--'))
  .map((a) => path.relative(ROOT, path.resolve(a)));

/** Source we own. Everything else is vendored, generated, or scratch. */
const EXCLUDED =
  /^(benchmark-results|\.tmp-[^/]*)\/|^benchmarks\/corpus\/|^benchmarks\/suites\/[^/]+\/workspace\/|(^|\/)fixtures?\//;

/*
 * TRACKED files only.
 *
 * Prettier honours `.prettierignore` and knows nothing about `.gitignore`, so
 * a full scan also walks generated output that happens to be on disk. Caught
 * by running this gate in a second worktree: one that had built the docs site
 * carried `apps/docs/.source/*`, which fumadocs generates and git ignores, and
 * the gate reported four files as newly unformatted purely because that
 * worktree had run a build.
 *
 * A gate whose verdict depends on which commands you happen to have run is
 * worse than no gate — it fails for people at random and gets muted. What git
 * tracks is the same everywhere, including on a clean CI checkout.
 */
const tracked = new Set(
  execFileSync('git', ['ls-files'], {
    cwd: ROOT,
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
  })
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean),
);

/** Paths prettier reports as differing, minus the ones we do not own. */
export function uncleanFiles(only: string[] = []): string[] {
  if (only.length === 0 && ONLY.length > 0) only = ONLY;
  let out = '';
  try {
    out = execFileSync(
      'npx',
      [
        'prettier',
        '--list-different',
        ...(only.length > 0
          ? only
          : ['**/*.{ts,tsx,mts,cts,js,mjs,cjs,json,md}']),
      ],
      { cwd: ROOT, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (error) {
    // `--list-different` exits non-zero precisely WHEN it finds files, so a
    // non-zero exit is the normal path and its stdout is the answer. Only an
    // empty stdout means the run itself failed.
    const e = error as { stdout?: string };
    out = e.stdout ?? '';
    if (out.trim() === '') throw error;
  }
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((p) => tracked.has(p))
    .filter((p) => !EXCLUDED.test(p))
    .sort();
}

function readBaselineList(): string[] {
  try {
    const raw = JSON.parse(fs.readFileSync(BASELINE, 'utf-8')) as {
      files?: string[];
    };
    return raw.files ?? [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

const current = uncleanFiles();
const baseline = readBaselineList();

if (UPDATE) {
  if (ONLY.length > 0) {
    console.error(
      '\n  ⛔ --update needs a full scan. Updating from a scoped run would' +
        '\n  drop every baselined file it did not look at, which empties the' +
        '\n  ratchet instead of shrinking it.\n',
    );
    process.exit(1);
  }
  const grew = current.filter((f) => !baseline.includes(f));
  if (grew.length > 0 && baseline.length > 0) {
    console.error(
      `\n  ⛔ refusing to grow the baseline by ${grew.length} file(s):\n` +
        grew
          .slice(0, 20)
          .map((f) => `     ${f}`)
          .join('\n') +
        '\n\n  Format them instead — `npx prettier --write <file>`.\n',
    );
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(
    BASELINE,
    `${JSON.stringify(
      {
        command: 'npx tsx scripts/check-format-drift.ts --update',
        note:
          'Source files we own that are not prettier-clean. SHRINK-ONLY: a file may ' +
          'leave this list, never join it. Prettier is enforced nowhere else in this ' +
          'repository — see the header of scripts/check-format-drift.ts.',
        recordedAt: new Date().toISOString().slice(0, 10),
        count: current.length,
        files: current,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `  format-drift baseline: ${baseline.length} → ${current.length}`,
  );
  process.exit(0);
}

const added = current.filter((f) => !baseline.includes(f));
const scoped = ONLY.length > 0;

if (scoped) {
  console.log(`\n  checked ${ONLY.length} file(s).`);
} else {
  console.log(`\n  ${current.length} owned source file(s) not prettier-clean.`);
  /*
   * Only a FULL scan may claim a file left the baseline. A scoped run sees a
   * handful of paths, so every baselined file it did not look at would read as
   * "fixed" — which is how a ratchet quietly resets itself to zero.
   */
  const fixed = baseline.filter((f) => !current.includes(f));
  if (fixed.length > 0) {
    console.log(
      `  ${fixed.length} fewer than the baseline — run with --update to record it.`,
    );
  }
}

if (added.length > 0) {
  console.error(
    `\n  ⛔ ${added.length} file(s) BECAME unformatted:\n` +
      added.map((f) => `     ${f}`).join('\n') +
      '\n\n  Run `npx prettier --write` on them. The existing debt is baselined' +
      '\n  and is not your problem; a file that was clean and is not any more is.\n',
  );
  process.exit(1);
}

console.log('  ✅ no file became unformatted.\n');
