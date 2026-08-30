/**
 * Locks for the infrastructure-observability metrics.
 *
 * Per CLAUDE.md: every metric added is a metric that can silently stop being
 * collected, and a metric that stops being collected fails exactly like one
 * that never existed. These tests fail if a metric disappears, if the
 * measured/publishable invariant breaks, or if the two consumer-facing devkit
 * invariants regress.
 *
 * Run from the repo root:
 *   npx vitest run scripts/__tests__/infra-metrics-lock.test.ts
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  classify,
  project,
  METRIC_KEYS,
  METRIC_FLOOR,
} from '../check-artifact-size.js';
import { mandatoryPeers, classifyModule } from '../devkit-infra-metrics.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SIZE_BASELINE = join(ROOT, '.agent', 'artifact-size-baseline.json');
const INFRA_BASELINE = join(ROOT, '.agent', 'devkit-infra-baseline.json');

/** Every publishable package — the denominator the coverage invariant uses. */
function publishablePackages(): string[] {
  const dir = join(ROOT, 'packages');
  return readdirSync(dir)
    .filter((d) => existsSync(join(dir, d, 'package.json')))
    .map(
      (d) =>
        JSON.parse(readFileSync(join(dir, d, 'package.json'), 'utf8')) as {
          name: string;
          private?: boolean;
        },
    )
    .filter((p) => !p.private)
    .map((p) => p.name)
    .sort();
}

describe('artifact-size baseline', () => {
  const baseline = JSON.parse(readFileSync(SIZE_BASELINE, 'utf8')) as {
    packages: Record<string, Record<string, number>>;
  };

  it('records every metric for every package', () => {
    for (const [name, metrics] of Object.entries(baseline.packages)) {
      for (const key of METRIC_KEYS) {
        expect(
          typeof metrics[key],
          `${name}.${key} missing from the baseline`,
        ).toBe('number');
      }
    }
  });

  // The blocking invariant from the intent: "advisory" must never decay into
  // "unmeasured". Four plugins reached npm with no size history before this.
  it('covers 100% of publishable packages', () => {
    const measured = Object.keys(baseline.packages).sort();
    expect(measured).toEqual(publishablePackages());
  });

  it('is not vacuous — the packages it lists actually exist', () => {
    expect(Object.keys(baseline.packages).length).toBeGreaterThan(25);
  });
});

describe('project', () => {
  const packages = {
    a: { unpacked: 100, tarball: 30, files: 12 },
    b: { unpacked: 200, tarball: 55, files: 40 },
  };

  it('pulls one metric out so classify can stay Record<string, number>', () => {
    expect(project(packages, 'tarball')).toEqual({ a: 30, b: 55 });
    expect(project(packages, 'files')).toEqual({ a: 12, b: 40 });
  });

  // The whole reason `project` exists: one comparison, three metrics.
  it('feeds classify unchanged', () => {
    const diff = classify(project(packages, 'files'), [], { a: 12, b: 12 });
    expect(diff.grew.map((r) => r.name)).toEqual(['b']);
  });
});

describe('per-metric noise floor', () => {
  // `MIN_ABSOLUTE_KB` is 10 KILOBYTES. Applied unchanged to a FILE COUNT it
  // exempts every package under 10 files — the bottom of the real range (the
  // smallest package here ships 10) and exactly where a handful of junk files
  // is hardest to spot. The floor has to follow the metric's unit.
  it('does not apply the kB floor to file counts', () => {
    expect(METRIC_FLOOR.files).toBe(0);
    expect(METRIC_FLOOR.unpacked).toBeGreaterThan(0);
  });

  it('reports a small package gaining files, which the kB floor hid', () => {
    const withFileFloor = classify(
      { tiny: 9 },
      [],
      { tiny: 7 },
      METRIC_FLOOR.files,
    );
    expect(withFileFloor.grew.map((r) => r.name)).toEqual(['tiny']);

    // The same numbers under the byte floor vanish. That was the bug.
    const withKbFloor = classify({ tiny: 9 }, [], { tiny: 7 }, 10);
    expect(withKbFloor.grew).toEqual([]);
  });

  it('still treats a sub-floor byte change as noise', () => {
    const diff = classify({ tiny: 9 }, [], { tiny: 7 }, METRIC_FLOOR.unpacked);
    expect(diff.grew).toEqual([]);
  });
});

describe('devkit infrastructure invariants', () => {
  const infra = (
    JSON.parse(readFileSync(INFRA_BASELINE, 'utf8')) as {
      metrics: {
        mandatoryPeers: string[];
        barrelExternals: string[];
        barrelExports: number;
        barrelOwnKb: number;
      };
    }
  ).metrics;

  /**
   * The 24 MB incident, as a test. `@typescript-eslint/utils` was the only
   * runtime import devkit ever made from that package, and it dragged a
   * non-optional `typescript` peer into every plugin install. Porting
   * RuleCreator made it optional. This fails if it ever goes back.
   */
  it('forces only eslint on consumers', () => {
    expect(infra.mandatoryPeers).toEqual(['eslint']);
  });

  /**
   * `oxc-resolver` is a native binary needed only by src/resolver/, and
   * src/index.ts documents that it loads lazily so importing the barrel does
   * not require it. That was a comment; this is the check.
   */
  it('pulls in no external package at barrel import time', () => {
    expect(infra.barrelExternals).toEqual([]);
  });

  it('still measures a real module graph', () => {
    expect(infra.barrelOwnKb).toBeGreaterThan(0);
    expect(infra.barrelExports).toBeGreaterThan(0);
  });
});

describe('mandatoryPeers', () => {
  it('treats a peer with no meta entry as mandatory', () => {
    expect(
      mandatoryPeers({
        peerDependencies: { eslint: '*', typescript: '*' },
        peerDependenciesMeta: { typescript: { optional: true } },
      }),
    ).toEqual(['eslint']);
  });

  it('treats optional: false as mandatory, not as absent', () => {
    expect(
      mandatoryPeers({
        peerDependencies: { a: '*' },
        peerDependenciesMeta: { a: { optional: false } },
      }),
    ).toEqual(['a']);
  });

  it('handles a manifest with no peers at all', () => {
    expect(mandatoryPeers({})).toEqual([]);
  });
});

describe('classifyModule', () => {
  const dist = '/repo/packages/eslint-devkit/dist/src';

  it('counts devkit dist files as own', () => {
    expect(classifyModule(`${dist}/messaging/index.js`, dist)).toEqual({
      own: true,
    });
  });

  it('names an unscoped external by package', () => {
    expect(
      classifyModule('/repo/node_modules/eslint/lib/api.js', dist),
    ).toEqual({ own: false, external: 'eslint' });
  });

  // A scoped package is two path segments; taking one would report "@typescript-eslint"
  // for every package in the scope and make the externals list useless.
  it('names a scoped external with its scope', () => {
    expect(
      classifyModule(
        '/repo/node_modules/@typescript-eslint/utils/dist/index.js',
        dist,
      ),
    ).toEqual({ own: false, external: '@typescript-eslint/utils' });
  });

  it('does not claim a non-devkit, non-node_modules file', () => {
    expect(classifyModule('/repo/scripts/thing.js', dist)).toEqual({
      own: false,
    });
  });

  // A path ending at the scope boundary has no package segment. Without a
  // guard the template literal produces the string "@scope/undefined", which
  // would then be diffed against the baseline as though it were a real
  // package that had appeared in the barrel's module graph.
  it('does not invent "@scope/undefined" from a truncated scoped path', () => {
    const r = classifyModule('/repo/node_modules/@scope/', dist);
    expect(r.external).not.toContain('undefined');
  });
});

describe('bench_configs gate — the metrics must actually fire', () => {
  const workflow = readFileSync(
    join(ROOT, '.github', 'workflows', 'quality-full.yml'),
    'utf8',
  );

  /** The grep pattern the gate uses to decide whether bench-configs runs. */
  function gatePattern(): RegExp {
    const m = workflow.match(/grep -qE '\^\((.+?)\)\$'/);
    if (!m) throw new Error('bench_configs gate pattern not found');
    return new RegExp(`^(${m[1]})$`);
  }

  /**
   * The artifact-size and devkit-infra steps live in `bench-configs`, so this
   * gate decides whether shipped bytes get measured at all. It keyed on
   * package MANIFESTS only, which meant a PR adding a rule — the most common
   * change in this repo — shipped bytes and was never measured, while the
   * job's own comment claimed feedback was merely delayed.
   */
  it('opens for a package source change', () => {
    expect(
      gatePattern().test(
        'packages/eslint-plugin-node-security/src/rules/some-rule.ts',
      ),
    ).toBe(true);
  });

  it('still opens for a manifest and a benchmark config', () => {
    const re = gatePattern();
    expect(re.test('packages/eslint-plugin-node-security/package.json')).toBe(
      true,
    );
    expect(
      re.test('benchmarks/suites/ilb-arena/configs/interlace.config.js'),
    ).toBe(true);
  });

  it('opens when the metric scripts or their baselines change', () => {
    const re = gatePattern();
    expect(re.test('scripts/check-artifact-size.ts')).toBe(true);
    expect(re.test('scripts/devkit-infra-metrics.ts')).toBe(true);
    expect(re.test('.agent/artifact-size-baseline.json')).toBe(true);
  });

  // The gate has to stay a gate: a docs-only PR ships no bytes and should not
  // pay for a full build. A pattern that matched everything would "fix" the
  // bug above while quietly making the job unconditional.
  it('stays closed for a change that ships no bytes', () => {
    const re = gatePattern();
    expect(re.test('README.md')).toBe(false);
    expect(re.test('docs/intents/infra-metrics/intent.md')).toBe(false);
  });
});

describe('turbo remote cache is kept out of the publish path', () => {
  const WORKFLOW_DIR = join(ROOT, '.github', 'workflows');
  const setup = readFileSync(
    join(ROOT, '.github', 'actions', 'setup', 'action.yml'),
    'utf8',
  );

  /**
   * Workflows that publish, sign, or attest. A third-party action in their
   * dependency chain is a supply-chain path into every package we ship, which
   * is a different class of risk from making a PR check faster.
   */
  const PUBLISHING = ['release.yml', 'supply-chain-attestation.yml'];

  it('defaults to off in the shared composite', () => {
    // `release.yml` uses this composite four times. The default is what
    // decides whether it inherits the action.
    const block = setup.slice(setup.indexOf('turbo-remote-cache:'));
    const dflt = block
      .slice(0, block.indexOf('runs:'))
      .match(/default:\s*"(\w+)"/);
    expect(dflt?.[1]).toBe('false');
  });

  it('is not enabled by any publishing workflow', () => {
    for (const name of PUBLISHING) {
      const p = join(WORKFLOW_DIR, name);
      if (!existsSync(p)) continue;
      expect(
        readFileSync(p, 'utf8'),
        `${name} must not enable turbo-remote-cache`,
      ).not.toContain('turbo-remote-cache');
    }
  });

  // Pinned by commit SHA, like every other third-party action here. A moving
  // tag is the whole attack.
  it('pins the third-party action by SHA', () => {
    const m = setup.match(/uses:\s*rharkor\/caching-for-turbo@([a-f0-9]{40})/);
    expect(
      m,
      'caching-for-turbo must be pinned to a 40-char commit SHA',
    ).not.toBeNull();
  });
});
