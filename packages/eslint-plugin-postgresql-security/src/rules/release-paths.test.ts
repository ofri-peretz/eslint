/**
 * `no-missing-client-release` and `prevent-double-release` on every place
 * `client.release()` can sit around one query that may throw: at the end of
 * the `try` (t), in the `catch` (c), in the `finally` (f), after the `try` (a),
 * with the catch absent, swallowing the error, or rethrowing it — each with
 * and without an early return after the query that releases first
 * (`if (early) { client.release(); return; }`, e). 80 shapes.
 *
 * The expectations are NOT the rules' output. They are path semantics — the
 * same defs as `spec/pg-release.qnt`, the model these fixtures came from:
 *
 *   okPath    releases = t + f + a
 *   errPath   releases = no catch ? f : c + f + (catch swallows ? a : 0)
 *   earlyPath releases = e + f            (only when there is an early return)
 *   leaks   = okPath == 0 or errPath == 0   → no-missing-client-release
 *   double  = any path releases more than once → prevent-double-release
 *
 * The early return found both rules counting every `return` in a `try` as a
 * way out that skips the release: a release after the try, or in the catch,
 * was reported as a second release (prevent-double-release) or as not
 * guaranteed (no-missing-client-release) although the early path had
 * already given the client back and left.
 *
 * The rules used to disagree on three of them: a release in a rethrowing catch
 * plus one after the try (both rules), a swallowing catch with the release
 * after the try, and every double release where each path still releases at
 * least once (all reported as leaks too).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingClientRelease } from './no-missing-client-release';
import { preventDoubleRelease } from './prevent-double-release';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

type Site = 'e' | 't' | 'c' | 'f' | 'a';
type CatchKind = 'none' | 'swallow' | 'rethrow';
type Shape = Record<Site, boolean> & { kind: CatchKind };

/** In source order: the early return sits right after the query. */
const SITES: readonly Site[] = ['e', 't', 'c', 'f', 'a'];

const SHAPES: Shape[] = (['none', 'swallow', 'rethrow'] as const).flatMap(
  (kind) =>
    Array.from({ length: 32 }, (_, m) => ({
      t: (m & 1) !== 0,
      c: (m & 2) !== 0,
      f: (m & 4) !== 0,
      a: (m & 8) !== 0,
      e: (m & 16) !== 0,
      kind,
    }))
      // No catch, no catch release.
      .filter((shape) => kind !== 'none' || !shape.c),
);

/** The releases each path runs, in the order it runs them. */
function okPath(s: Shape): Site[] {
  return SITES.filter((site) => site !== 'c' && site !== 'e' && s[site]);
}
function errPath(s: Shape): Site[] {
  if (s.kind === 'none') return s.f ? ['f'] : [];
  return SITES.filter(
    (site) =>
      site !== 't' &&
      site !== 'e' &&
      s[site] &&
      (site !== 'a' || s.kind === 'swallow'),
  );
}
/** The early return: its own release, then the finally. No path without `e`. */
function earlyPath(s: Shape): Site[] {
  if (!s.e) return [];
  return s.f ? ['e', 'f'] : ['e'];
}

/**
 * The shape as source, and the line each release is on. With no catch and no
 * finally there is no `try` at all — `try {}` alone is not JavaScript — so the
 * query and its releases are inline.
 */
function render(s: Shape): {
  code: string;
  line: Partial<Record<Site, number>>;
} {
  const lines = [
    `import { Pool } from 'pg';`,
    `const pool = new Pool();`,
    `export async function f(early) {`,
    `  const client = await pool.connect();`,
  ];
  const line: Partial<Record<Site, number>> = {};
  const release = (site: Site, indent: string): void => {
    lines.push(`${indent}client.release();`);
    line[site] = lines.length;
  };
  const early = (indent: string): void => {
    lines.push(`${indent}if (early) {`);
    release('e', `${indent}  `);
    lines.push(`${indent}  return;`, `${indent}}`);
  };
  if (s.kind === 'none' && !s.f) {
    lines.push(`  await client.query('SELECT 1');`);
    if (s.e) early('  ');
    if (s.t) release('t', '  ');
  } else {
    lines.push('  try {', `    await client.query('SELECT 1');`);
    if (s.e) early('    ');
    if (s.t) release('t', '    ');
    if (s.kind !== 'none') {
      lines.push('  } catch (e) {');
      if (s.c) release('c', '    ');
      if (s.kind === 'rethrow') lines.push('    throw e;');
    }
    if (s.f) {
      lines.push('  } finally {');
      release('f', '    ');
    }
    lines.push('  }');
  }
  if (s.a) release('a', '  ');
  lines.push('}');
  return { code: `${lines.join('\n')}\n`, line };
}

const name = (s: Shape): string =>
  `${SITES.filter((site) => s[site]).join('+') || 'no release'} / catch: ${s.kind}`;

const cases = SHAPES.map((shape) => ({ shape, ...render(shape) }));

describe('release paths — 80 shapes against path semantics', () => {
  const leaks = (s: Shape): boolean =>
    okPath(s).length === 0 || errPath(s).length === 0;

  ruleTester.run('no-missing-client-release', noMissingClientRelease, {
    valid: cases
      .filter(({ shape }) => !leaks(shape))
      .map(({ shape, code }) => ({ name: name(shape), code })),
    invalid: cases
      .filter(({ shape }) => leaks(shape))
      .map(({ shape, code }) => ({
        name: name(shape),
        code,
        errors: [
          {
            messageId: SITES.some((site) => shape[site])
              ? ('releaseNotGuaranteed' as const)
              : ('missingClientRelease' as const),
            line: 4,
          },
        ],
      })),
  });

  // Reported: every release that runs on a path after that path has already
  // released the client. SITES is in source order, so the errors are too.
  const secondReleases = (s: Shape): Site[] => {
    const late = new Set([
      ...okPath(s).slice(1),
      ...errPath(s).slice(1),
      ...earlyPath(s).slice(1),
    ]);
    return SITES.filter((site) => late.has(site));
  };

  ruleTester.run('prevent-double-release', preventDoubleRelease, {
    valid: cases
      .filter(({ shape }) => secondReleases(shape).length === 0)
      .map(({ shape, code }) => ({ name: name(shape), code })),
    invalid: cases
      .filter(({ shape }) => secondReleases(shape).length > 0)
      .map(({ shape, code, line }) => ({
        name: name(shape),
        code,
        errors: secondReleases(shape).map((site) => ({
          messageId: 'doubleRelease' as const,
          line: line[site],
        })),
      })),
  });
});
