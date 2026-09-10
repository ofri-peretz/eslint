/**
 * @provenBy {"file":"scripts/audit-api-surface.ts","find":"  'coverage_pct',\n","replace":""}
 */

/*
 * A coverage percentage may not be a number somebody typed.
 *
 * The published per-plugin table was rendered from `.agent/api-surface-manifest.json`,
 * and the audit checked that `covered / inScope` matched `coverage_pct` and cleared
 * a floor. Both sides of that comparison were hand-maintained, so the check passed
 * on any self-consistent edit — two plugins published "100%" while the measurement
 * bounded them at 33%, and one published 72% while nothing in its sources named a
 * single API of its declared surface.
 *
 * A value check cannot catch that, because editing the value is exactly the move
 * being caught. So the FIELD is rejected: a manifest that cannot express a count
 * cannot publish one.
 */
import { describe, expect, it } from 'vitest';
import {
  auditSurfaces,
  upperBoundPct,
  type Measurement,
  type PluginEntry,
} from '../audit-api-surface.ts';

const FLOOR = 60;

/*
 * `measure-api-surface.mts` emits `namedCount` as `surfaceSize - gap.length`,
 * so the two fields are one fact written twice and a fixture that sets them
 * independently describes a measurement the producer cannot emit. Deriving it
 * here keeps the fixtures honest; an explicit `namedCount` in `over` still
 * wins, which is what the above-100% case needs.
 */
const measurement = (
  over: Partial<Measurement['measured'][0]> = {},
): Measurement => {
  const surface = Array.from({ length: 10 }, (_, i) => `api${i}`);
  const uncovered = over.uncovered ?? ['api9'];
  return {
    measuredAt: '2026-09-09T00:00:00.000Z',
    node: 'v24.12.0',
    measured: [
      {
        plugin: 'eslint-plugin-demo',
        surfaceSize: surface.length,
        namedCount: surface.length - uncovered.length,
        upperBoundPct: 90,
        surface,
        uncovered,
        ...over,
      },
    ],
    notEnumerable: [],
  };
};

const entry = (over: Partial<PluginEntry> = {}): PluginEntry => ({
  plugin: 'eslint-plugin-demo',
  surface: 'demo SDK',
  surfaceVersion: 'demo@1',
  denominatorTrust: 'curated',
  denominatorNote:
    'Every name is public API of the demo SDK at the installed version.',
  notes: 'n/a',
  ...over,
});

const errors = (f: ReturnType<typeof auditSurfaces>): string[] =>
  f.filter((x) => x.severity === 'error').map((x) => x.message);

describe('a coverage count cannot be declared', () => {
  it('rejects a hand-typed coverage_pct even when it agrees with the measurement', () => {
    // 9 named of 10 in scope IS 90%. The number is arithmetically right and
    // still forbidden — the point is that nobody gets to type it.
    const withTyped = {
      ...entry(),
      coverage_pct: 90,
    } as unknown as PluginEntry;
    expect(
      errors(auditSurfaces([withTyped], measurement(), FLOOR, [])),
    ).toEqual([
      expect.stringContaining('"coverage_pct" is measured, not declared'),
    ]);
  });

  it('accepts the same entry once the count is gone', () => {
    expect(errors(auditSurfaces([entry()], measurement(), FLOOR, []))).toEqual(
      [],
    );
  });
});

describe('prose cannot restate a coverage figure', () => {
  it('rejects a percentage typed into notes', () => {
    /*
     * Removing the count FIELDS moved this rather than fixing it: three notes
     * still carried hand-typed percentages, and the report prints each note
     * directly under the measured bound — so one plugin's row read "≤ 17%"
     * with "63% is at the floor" beneath it.
     */
    const e = entry({ notes: '63% is at the floor and the coverage is fine.' });
    expect(errors(auditSurfaces([e], measurement(), FLOOR, []))).toEqual([
      expect.stringContaining('notes states a figure'),
    ]);
  });

  it('rejects an "N of M" coverage claim typed into notes', () => {
    const e = entry({
      notes: 'Complete: all 13 of 14 in-scope APIs have a rule.',
    });
    expect(errors(auditSurfaces([e], measurement(), FLOOR, []))).toEqual([
      expect.stringContaining('notes states a figure'),
    ]);
  });

  it('still allows a denominatorNote to cite a surface size, which is its argument', () => {
    // "Reads as 1 callable because better-sqlite3 default-exports a class" IS
    // the evidence for marking a denominator raw. Stripping the number would
    // leave an assertion with nothing behind it — the defect, not the fix.
    const e = entry({
      denominatorTrust: 'raw',
      denominatorNote:
        'Reads as 1 callable because the package default-exports a class.',
    });
    expect(errors(auditSurfaces([e], measurement(), FLOOR, []))).toEqual([]);
  });

  it('still rejects a percentage in a denominatorNote', () => {
    const e = entry({
      denominatorTrust: 'raw',
      denominatorNote:
        'Roughly 40% of this surface is internal plumbing nobody calls.',
    });
    expect(errors(auditSurfaces([e], measurement(), FLOOR, []))).toEqual([
      expect.stringContaining('denominatorNote states a figure'),
    ]);
  });
});

describe('the denominator cannot be shrunk for free', () => {
  it('rejects an exclusion naming an API that is not on the measured surface', () => {
    // The live defect: postgresql-security excluded `pg.types.setTypeParser`,
    // which the measurement never counted, and banked the point anyway.
    const e = entry({
      outOfScope: [
        {
          api: 'notOnTheSurface',
          reason: 'Reads configuration and reaches no sink at all.',
        },
      ],
    });
    expect(errors(auditSurfaces([e], measurement(), FLOOR, []))).toEqual([
      expect.stringContaining('is not on the measured surface'),
    ]);
  });

  it('rejects an exclusion argued from how rarely the API is used', () => {
    const e = entry({
      outOfScope: [
        { api: 'api9', reason: 'This API is rare and almost nobody calls it.' },
      ],
    });
    expect(errors(auditSurfaces([e], measurement(), FLOOR, []))).toEqual([
      expect.stringContaining('argued from frequency'),
    ]);
  });
});

describe('the floor is one-directional and only applies to a trusted denominator', () => {
  it('fails a curated plugin whose upper bound is newly below the floor', () => {
    const m = measurement({
      uncovered: ['api3', 'api4', 'api5', 'api6', 'api7', 'api8', 'api9'],
    }); // 3/10 = 30%
    expect(errors(auditSurfaces([entry()], m, FLOOR, []))).toEqual([
      expect.stringContaining(
        'below the 60% floor and is not in the recorded debt',
      ),
    ]);
  });

  it('reports a measured plugin that no manifest entry declares', () => {
    /*
     * Deleting a manifest entry used to remove the plugin from the floor
     * check, from the debt comparison and from the published table at the same
     * time — one JSON deletion, changed verdict, no finding. Nothing walked
     * the measurement in this direction until this arm existed.
     */
    expect(errors(auditSurfaces([], measurement(), FLOOR, []))).toEqual([
      expect.stringContaining('no manifest entry'),
    ]);
  });

  it('does not judge a raw denominator against the floor', () => {
    // @aws-sdk/client-lambda enumerates the Lambda control plane. Failing a
    // handler-security plugin against that number would look measured and be
    // just as wrong as the constant it replaced.
    const m = measurement({
      uncovered: Array.from({ length: 10 }, (_, i) => `api${i}`),
    });
    const raw = entry({
      denominatorTrust: 'raw',
      denominatorNote:
        'Raw module enumeration; not reviewed against the consumer-callable surface.',
    });
    expect(errors(auditSurfaces([raw], m, FLOOR, []))).toEqual([]);
  });

  it('refuses debt recorded against a raw denominator', () => {
    const m = measurement({
      uncovered: Array.from({ length: 10 }, (_, i) => `api${i}`),
    });
    const raw = entry({
      denominatorTrust: 'raw',
      denominatorNote:
        'Raw module enumeration; not reviewed against the consumer-callable surface.',
    });
    expect(
      errors(auditSurfaces([raw], m, FLOOR, ['eslint-plugin-demo'])),
    ).toEqual([expect.stringContaining('denominator is raw')]);
  });

  it('warns rather than errors on a plugin that is below the floor and recorded', () => {
    /*
     * The reason `--strict` can mean anything. Every other finding this audit
     * emits is an error, so before this arm existed `findings.length` and
     * `errors.length` were always equal and the strict exit could never fire
     * on its own — a flag that could not change an outcome, in the script
     * whose whole subject is checks that cannot fail.
     */
    const m = measurement({
      uncovered: ['api3', 'api4', 'api5', 'api6', 'api7', 'api8', 'api9'],
    }); // 30%
    const f = auditSurfaces([entry()], m, FLOOR, ['eslint-plugin-demo']);
    expect(errors(f)).toEqual([]);
    expect(
      f.filter((x) => x.severity === 'warn').map((x) => x.message),
    ).toEqual([
      expect.stringContaining('recorded debt, and the list only shrinks'),
    ]);
  });

  it('says nothing at all about a plugin comfortably above the floor', () => {
    // So the warn arm above is specific to debt, not to every curated plugin.
    expect(auditSurfaces([entry()], measurement(), FLOOR, [])).toEqual([]);
  });

  it('makes the debt list shrink-only: a plugin that climbs out must be removed', () => {
    expect(
      errors(
        auditSurfaces([entry()], measurement(), FLOOR, ['eslint-plugin-demo']),
      ),
    ).toEqual([expect.stringContaining('bounds at 90%')]);
  });
});

describe('upperBoundPct', () => {
  it('measures against the in-scope surface, not the whole surface', () => {
    const m = measurement().measured[0];
    expect(upperBoundPct(m, [])).toBe(90);
    // api9 is the uncovered one: excluding it removes a gap, not a hit.
    expect(upperBoundPct(m, ['api9'])).toBe(100);
  });

  it('takes an excluded API out of the numerator as well as the denominator', () => {
    /*
     * api0 IS named by a rule. Subtracting a COUNT from the denominator while
     * leaving `namedCount` whole kept that hit in the numerator and removed
     * its slot from the denominator — 9/9, a clean 100% for a surface with a
     * known gap still in it.
     */
    expect(upperBoundPct(measurement().measured[0], ['api0'])).toBe(89);
  });

  it('cannot publish a bound above 100%', () => {
    // The arithmetic that made this reachable: a fully-named surface with one
    // name excluded read as 10/9.
    const m = measurement({ namedCount: 10, uncovered: [] }).measured[0];
    expect(upperBoundPct(m, ['api0'])).toBe(100);
  });

  it('reports 0 rather than dividing by zero when everything is excluded', () => {
    const m = measurement().measured[0];
    expect(upperBoundPct(m, m.surface)).toBe(0);
  });
});
