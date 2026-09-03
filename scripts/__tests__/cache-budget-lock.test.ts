/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The Actions cache is a 10 GB budget shared by every cache in the repo, and
 * on 2026-09-02 it was 9.73 GB across 685 entries — 97% full, evicting LRU on
 * every write.
 *
 * That number is what makes these assertions load-bearing. Under eviction a
 * cache is not free storage; it is a bidder against every other cache. A step
 * that stores 2.36 GB for a path taken only when the lockfile changes was
 * outbidding node_modules and Next.js on the path taken every run. Nothing in
 * CI reports that: every job stayed green while its own hit rate fell.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { load } from 'js-yaml';

const ROOT = resolve(__dirname, '..', '..');
const SETUP = readFileSync(
  join(ROOT, '.github/actions/setup/action.yml'),
  'utf8',
);
const TURBO_WORKFLOWS = ['quality.yml', 'quality-full.yml', 'a11y.yml'];

describe('every composite action is parseable YAML', () => {
  // `lint-workflows.ts` covers `.github/workflows/`, not `.github/actions/`,
  // and every other check in this file matches strings against the file text —
  // which a file that YAML cannot parse satisfies just as well as one it can.
  //
  // On 2026-09-02 an unquoted `: ` inside a `run:` ("Remote cache: Vercel")
  // made the whole setup action unparseable. Every job that uses it failed at
  // once — oxlint, Gate, Validate documentation — while this file's own
  // assertions stayed green, because grep does not care about YAML.
  const dir = resolve(ROOT, '.github/actions');
  const actions = readdirSync(dir)
    .map((d) => join(dir, d, 'action.yml'))
    .filter((f) => existsSync(f));

  it('finds composite actions to check', () => {
    expect(actions.length).toBeGreaterThan(0);
  });

  it.each(actions)('%s parses', (file) => {
    expect(() => load(readFileSync(file, 'utf8'))).not.toThrow();
  });
});

describe('the Actions cache budget', () => {
  it('does not cache the npm registry directory', () => {
    // Removed 2026-09-02: 2.36 GB, restored only after the node_modules cache
    // had already missed. `npm ci` still runs there, fetching from the
    // registry. Re-adding it takes ~24% of the repo's entire allowance.
    expect(SETUP).not.toMatch(/key:\s*npm-\$\{\{\s*runner\.os/);
    expect(SETUP).not.toContain('Restore npm registry cache');
  });
});

describe('only main writes the big caches', () => {
  /**
   * `actions/cache` saves whenever its key missed. A key that changes on every
   * PR therefore writes a fresh entry per PR that nothing can ever look up
   * again, because the key that produced it cannot recur.
   *
   * The Next.js key hashes every source file in apps/docs and packages/ui, so
   * it changed on essentially every PR: 9 entries, 3.56 GB, the largest single
   * consumer of a 10 GB allowance measured at 11.98 GB and evicting. Restores
   * were always coming from main via the restore-keys prefix; the per-PR save
   * was pure cost.
   */
  const bigWriters = ['Next.js build cache', 'Turbo cache'];

  it.each(bigWriters)('%s only SAVES on main', (label) => {
    const at = SETUP.indexOf(`${label} (main`);
    expect(at, `no "${label} (main — restore + save)" step`).toBeGreaterThan(
      -1,
    );
    expect(SETUP.slice(at, at + 300)).toMatch(
      /if:.*github\.ref == 'refs\/heads\/main'/,
    );
  });

  it('the branch path restores without saving', () => {
    // `actions/cache/restore`, not `actions/cache` — the plain action registers
    // a post-job save, which is the whole cost being removed here.
    const at = SETUP.indexOf('Restore Next.js build cache (branches');
    expect(at, 'no branch-scoped Next.js restore step').toBeGreaterThan(-1);
    const step = SETUP.slice(at, at + 400);
    expect(step).toMatch(/uses: actions\/cache\/restore@/);
    expect(step).toMatch(/if:.*github\.ref != 'refs\/heads\/main'/);
  });
});

describe('exactly one Turborepo remote-cache backend can be active', () => {
  // Both at once would leave the shim's TURBO_API pointing at a localhost
  // server while the credentials in the environment name Vercel. The failure
  // is silent: turbo writes to one and reads from neither.
  const guarded = (needle: string) => {
    const at = SETUP.indexOf(needle);
    expect(at, `step not found: ${needle}`).toBeGreaterThan(-1);
    // The `if:` sits on the line after the step's `- name:`.
    return SETUP.slice(at, at + 400);
  };

  it('the Actions backend runs only when no token is present', () => {
    expect(guarded('Turborepo remote cache (GitHub Actions backend')).toMatch(
      /if:.*env\.TURBO_TOKEN\s*==\s*''/,
    );
  });

  it('the Vercel backend runs only when a token is present', () => {
    expect(guarded('Turborepo remote cache (Vercel')).toMatch(
      /if:.*env\.TURBO_TOKEN\s*!=\s*''/,
    );
  });
});

describe('the Vercel Remote Cache request budget', () => {
  /**
   * Vercel's fair-use cap is on REQUEST RATE, not storage — artifacts expire
   * after 7 days on their own, so there is no size to manage.
   *
   * Every opted-in job starts its turbo run at roughly the same moment, and
   * turbo issues at least one lookup per task plus an upload on a miss.
   * Measured 2026-09-02: `turbo run build --dry` = 37 tasks, `turbo run test
   * --dry` = 57. So the safe number of opted-in jobs is
   *
   *   floor(plan requests-per-minute / worst-case tasks)
   *
   * and it differs by a factor of a hundred between plans. Which makes the
   * plan a REQUIRED INPUT, not a footnote: at 7 opted-in jobs this repo sends
   * 259-798 requests in the opening minute — about 5-8% of Pro's allowance and
   * 2.6x-8x over Hobby's.
   *
   * That number was carried as an unknown for a day, which is the actual
   * defect being fixed here. Declare the plan and the bound follows from it;
   * leave it undeclared and this fails rather than silently assuming the
   * generous answer. A merge-queue run is worse again, since it executes ALL
   * shards where a PR run executes only affected ones.
   */
  const PLAN_REQUESTS_PER_MINUTE: Record<string, number> = {
    hobby: 100,
    pro: 10_000,
    enterprise: 10_000,
  };

  /** Worst case measured: `turbo run test --dry`. */
  const TASKS_PER_JOB = 57;

  /**
   * The plan this repo's Vercel team is on.
   *
   * Deliberately a constant rather than an env lookup: a lock that reads its
   * own threshold from the environment passes everywhere and asserts nothing.
   * Changing plan is a one-line edit here, and the diff is the record of when
   * the ceiling moved.
   */
  const VERCEL_PLAN: keyof typeof PLAN_REQUESTS_PER_MINUTE | 'undeclared' =
    'undeclared';

  /**
   * Measured status quo. While the plan is undeclared this is the bound, and
   * its only job is to stop the count growing silently — every added job is
   * another ~57 requests into the same opening minute.
   */
  const MEASURED_JOBS = 7;

  const cap =
    VERCEL_PLAN === 'undeclared'
      ? undefined
      : PLAN_REQUESTS_PER_MINUTE[VERCEL_PLAN];
  const ceiling =
    cap === undefined ? MEASURED_JOBS : Math.floor(cap / TASKS_PER_JOB);

  it('records what each plan would allow', () => {
    // Not decoration. On hobby the ceiling is 1 and this repo is at 7 — so the
    // plan is not a footnote to look up later, it decides whether the current
    // configuration is fine or 7x over. Kept as an executable statement so the
    // arithmetic cannot drift from the comment.
    expect(Math.floor(PLAN_REQUESTS_PER_MINUTE.hobby / TASKS_PER_JOB)).toBe(1);
    expect(
      Math.floor(PLAN_REQUESTS_PER_MINUTE.pro / TASKS_PER_JOB),
    ).toBeGreaterThan(MEASURED_JOBS);
  });

  it('no more jobs opt in than the plan allows', () => {
    const dir = join(ROOT, '.github/workflows');
    const optedIn = readdirSync(dir)
      .filter((f) => f.endsWith('.yml'))
      .map((f) => readFileSync(join(dir, f), 'utf8'))
      .reduce(
        (n, src) =>
          n + (src.match(/turbo-remote-cache:\s*['"]true['"]/g) ?? []).length,
        0,
      );

    expect(
      optedIn,
      `${optedIn} jobs enable the remote cache; the bound is ${ceiling}` +
        (cap === undefined
          ? ' (the measured status quo, because VERCEL_PLAN is undeclared).' +
            ' Before turning the remote cache on for real, set VERCEL_PLAN in' +
            ' this file: on hobby the ceiling is 1, not 7, and the cache is' +
            ' only inert today because no TURBO_TOKEN is set.'
          : ` for ${VERCEL_PLAN} (${cap} requests/min at ~${TASKS_PER_JOB} tasks each).`),
    ).toBeLessThanOrEqual(ceiling);
  });
});

describe('the OIDC exchange degrades instead of failing', () => {
  const step = SETUP.slice(
    SETUP.indexOf('Exchange the GitHub OIDC token'),
    SETUP.indexOf('Turborepo remote cache (GitHub Actions backend'),
  );

  it('is present', () => {
    expect(step.length).toBeGreaterThan(0);
  });

  it('carries continue-on-error', () => {
    // The single most important line here. The exchange fails in two ORDINARY
    // states — no OIDC policy on the Vercel team yet, and any fork PR, where
    // GitHub issues no writable id-token. Without this, wiring OIDC turns every
    // fork PR red, and a repo that accepts outside contributions cannot take
    // that. Neither state is a defect; both must fall through to the
    // Actions-backed cache.
    expect(step).toMatch(/continue-on-error:\s*true/);
  });

  it('runs before the backend it feeds', () => {
    // It exports TURBO_TOKEN, and the two backend steps below branch on it.
    // Ordered after them, the guards read an empty value and the Vercel path is
    // permanently unreachable while everything stays green.
    expect(SETUP.indexOf('Exchange the GitHub OIDC token')).toBeLessThan(
      SETUP.indexOf('Turborepo remote cache (GitHub Actions backend'),
    );
  });

  it('pins the third-party action by SHA', () => {
    // Same rule as every other third-party action here: a moving tag is the
    // whole attack, and this one mints a credential.
    expect(step).toMatch(
      /uses:\s*vercel\/setup-turborepo-remote-cache-action@[a-f0-9]{40}/,
    );
  });

  it('every workflow that opts in can actually mint a token', () => {
    // `id-token: write` is what makes the exchange possible. Missing it, the
    // step fails, continue-on-error swallows it, and the repo silently runs on
    // the fallback forever — configured, green, and doing nothing.
    for (const file of TURBO_WORKFLOWS) {
      const src = readFileSync(join(ROOT, '.github/workflows', file), 'utf8');
      expect(src, `${file} needs id-token: write`).toMatch(
        /^\s*id-token:\s*write/m,
      );
    }
  });
});

describe('the credentials reach the jobs that would use them', () => {
  it.each(TURBO_WORKFLOWS)(
    '%s passes TURBO_TOKEN and TURBO_TEAM through to the setup action',
    (file) => {
      // Without this the `env.TURBO_TOKEN` guards above are always false and
      // the Vercel path is unreachable — configured, inert, and green.
      const src = readFileSync(join(ROOT, '.github/workflows', file), 'utf8');
      expect(src).toContain('TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}');
      expect(src).toContain('TURBO_TEAM: ${{ vars.TURBO_TEAM }}');
    },
  );

  it('names every workflow that enables the remote cache', () => {
    // Guards the list above: a new workflow opting into turbo-remote-cache
    // without the env block would get the fallback silently and forever.
    const dir = join(ROOT, '.github/workflows');
    const opted = readdirSync(dir)
      .filter((f) => f.endsWith('.yml'))
      .filter((f) =>
        /turbo-remote-cache:\s*['"]true['"]/.test(
          readFileSync(join(dir, f), 'utf8'),
        ),
      );
    expect(opted.sort()).toEqual([...TURBO_WORKFLOWS].sort());
  });
});
