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

  /**
   * Each package README repeats the range in a Compatibility table, and npm
   * renders that README on the package page — for most consumers it is the
   * *only* place they read a version requirement.
   *
   * These are hand-written, not generated, and the check above cannot see
   * them: inside a markdown table the union is escaped as `\|\|`, so a grep
   * for the plain `^8.0.0 || ^9.0.0` shape misses every one. All 29 stayed
   * stale through the manifest fix for exactly that reason.
   */
  it('every package README repeats its own manifest range', () => {
    const drift = readdirSync(PACKAGES_DIR).flatMap((dir) => {
      const manifestPath = join(PACKAGES_DIR, dir, 'package.json');
      const readmePath = join(PACKAGES_DIR, dir, 'README.md');
      if (!existsSync(manifestPath) || !existsSync(readmePath)) return [];

      const peer = (JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest)
        .peerDependencies?.eslint;
      if (!peer) return [];

      // `| ESLint | \`^8.40.0 \|\| ^9.0.0 \|\| ^10.0.0\` |`, bold label or not.
      const row = /\|\s*(?:\*\*)?ESLint(?:\*\*)?\s*\|\s*`([^`]+)`/.exec(
        readFileSync(readmePath, 'utf8'),
      );
      if (!row) return [];

      const stated = row[1].replace(/\\\|/g, '|');
      return stated === peer ? [] : [`${dir}: README "${stated}" vs manifest "${peer}"`];
    });

    expect(drift).toEqual([]);
  });

  /**
   * The two repo-level surfaces that state the range in prose rather than in a
   * per-package table, so neither the manifest check nor the README check sees
   * them.
   *
   * Both survived the manifest fix in #407 still saying `^8.0.0`, and the
   * compatibility page is the one published on eslint.interlace.tools — the
   * storefront advertising support for 8.0–8.39, where every rule throws on
   * load. #423 corrected the text; this is what stops it drifting back.
   */
  it('states the same floor on the repo-level surfaces', () => {
    const surfaces = [
      'CLAIMS.md',
      'apps/docs/content/docs/getting-started/concepts/compatibility.mdx',
    ];

    const stale = surfaces.filter((file) => {
      const text = readFileSync(join(__dirname, '../..', file), 'utf8');
      // Markdown tables escape the union as `\|\|`, so accept either spelling —
      // the escaped form is why a plain grep missed these for so long.
      return (
        !text.includes(`^${MIN_ESLINT} || ^9.0.0 || ^10.0.0`) &&
        !text.includes(`^${MIN_ESLINT} \\|\\| ^9.0.0 \\|\\| ^10.0.0`)
      );
    });

    expect(stale).toEqual([]);
  });
});
