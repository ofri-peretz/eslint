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
