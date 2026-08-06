/**
 * The declared ESLint floor must match the one we can actually run.
 *
 * Every package shipped `"eslint": "^8.0.0 || ^9.0.0 || ^10.0.0"` while the
 * shared devkit reads `context.sourceCode` without a fallback — an API that
 * landed in **8.40**. On 8.0–8.39 the install resolved cleanly and then every
 * rule threw `Cannot read properties of undefined (reading 'ast')` at lint
 * time. npm reported nothing, because the manifest said the version was fine.
 *
 * Measured on eslint-plugin-nestjs-security@2.1.0: 8.39.0 throws on load,
 * 8.40.0 produces the expected finding. See docs/ESLINT_VERSION_SUPPORT.md.
 *
 * A floor is only meaningful if something checks it, so: this.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Lowest ESLint version whose API surface every rule here relies on. */
const MIN_ESLINT = '8.40.0';

const PACKAGES_DIR = join(__dirname, '../../packages');

interface Manifest {
  name?: string;
  private?: boolean;
  peerDependencies?: Record<string, string>;
}

function manifests(): { name: string; peer: string | undefined }[] {
  return readdirSync(PACKAGES_DIR)
    .map((dir) => join(PACKAGES_DIR, dir, 'package.json'))
    .filter((p) => existsSync(p))
    .map((p) => JSON.parse(readFileSync(p, 'utf8')) as Manifest)
    .filter((m) => m.private !== true && m.name)
    .map((m) => ({ name: m.name!, peer: m.peerDependencies?.eslint }));
}

/**
 * Every v8 leg of a union, as bare versions: `^8.40.0 || ^9.0.0` → `['8.40.0']`.
 *
 * All of them, not the first. `"^8.40.0 || ^8.0.0 || ^9.0.0"` satisfies a
 * first-match check while still resolving on 8.0, which is the exact shape this
 * file exists to reject.
 */
function v8Legs(range: string): string[] {
  return range
    .split('||')
    .filter((part) => /(\^|>=|~)?\s*8\./.test(part))
    .map((leg) => leg.trim().replace(/^[^\d]*/, ''));
}

/** Whether the union declares a leg for this major at all. */
function hasMajor(range: string, major: number): boolean {
  return range
    .split('||')
    .some((part) => new RegExp(`(\\^|>=|~)?\\s*${major}\\.`).test(part));
}

function gte(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  }
  return true;
}

describe('declared ESLint peer floor', () => {
  it('finds packages to check', () => {
    // Guards the whole file against a silent pass if the glob ever breaks —
    // an empty list would make every assertion below vacuously true.
    expect(manifests().filter((m) => m.peer).length).toBeGreaterThan(20);
  });

  it('every published package declares an eslint peer range', () => {
    // The assertions below all start by filtering to packages that declare the
    // peer, so *deleting* the field is the one edit that passes every one of
    // them. This is the assertion that notices.
    const missing = manifests()
      .filter((m) => !m.peer)
      .map((m) => m.name);

    expect(missing).toEqual([]);
  });

  it(`never claims support below ESLint ${MIN_ESLINT}`, () => {
    const violations = manifests()
      .filter((m) => m.peer)
      .flatMap((m) =>
        v8Legs(m.peer!)
          // Every leg, not the first: a union can widen itself further down.
          .filter((leg) => !gte(leg, MIN_ESLINT))
          .map((leg) => `${m.name}: "${m.peer}" allows ${leg}`),
      );

    expect(violations).toEqual([]);
  });

  it('still supports the majors the policy commits to', () => {
    // A range that drops v9 or v10 would pass the floor check by being narrower
    // than required, which is the opposite failure and just as wrong.
    const gaps = manifests()
      .filter((m) => m.peer)
      .flatMap((m) =>
        [8, 9, 10]
          .filter((major) => !hasMajor(m.peer!, major))
          .map((major) => `${m.name}: "${m.peer}" has no v${major} leg`),
      );

    expect(gaps).toEqual([]);
  });

  it('states the same floor in the canonical doc', () => {
    const doc = readFileSync(
      join(__dirname, '../../docs/ESLINT_VERSION_SUPPORT.md'),
      'utf8',
    );
    // The docs are what users read before the manifest; drift between the two
    // is how the wrong number survived this long.
    expect(doc).toContain(`^${MIN_ESLINT} || ^9.0.0 || ^10.0.0`);
    expect(doc).not.toContain('"eslint": "^8.0.0');
  });
});
