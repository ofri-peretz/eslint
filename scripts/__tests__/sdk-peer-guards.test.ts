/**
 * Every SDK peer must be optional and bounded by major.
 *
 * Two failure modes this pins, both found in the manifests on 2026-08-10:
 *
 * **Unbounded.** `maintainability`, `react-features` and `import-next` shipped
 * `"typescript": ">=4.8.4"`, which claims support for every future major
 * including ones we have already decided are not viable — the repo pins
 * Dependabot off the TypeScript major for exactly that reason. A range that
 * cannot be falsified is not a support statement.
 *
 * **Undeclared.** `eslint-plugin-react-a11y` handles `JSXElement`,
 * `JSXAttribute` and `JSXOpeningElement`, and named no React peer at all, so
 * nothing recorded which React majors its rules were written against.
 *
 * A peer that is *required* rather than optional is its own bug: an ESLint
 * plugin must never force an adopter to install Express or React to lint
 * something else. `eslint` itself is exempt — it is the runtime, not an SDK.
 *
 * Update 2026-11-25: the framework peers themselves were removed (the last
 * two tests below). The "optional" and "bounded" checks remain for the few
 * exceptions that are still declared.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PACKAGES_DIR = join(__dirname, '../../packages');

function manifestOf(dir: string): Manifest {
  return JSON.parse(readFileSync(join(PACKAGES_DIR, dir, 'package.json'), 'utf-8')) as Manifest;
}

interface Manifest {
  name?: string;
  private?: boolean;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}

/** The runtime, not an SDK — it is legitimately required. */
const RUNTIME = new Set(['eslint']);

/** The hosts a plugin is loaded by. Everything else is third-party. */
const HOSTS = new Set(['eslint', 'oxlint']);

function pluginManifests(): { name: string; manifest: Manifest }[] {
  return readdirSync(PACKAGES_DIR)
    .filter((dir) => dir.startsWith('eslint-plugin-'))
    .map((dir) => {
      const manifest = JSON.parse(
        readFileSync(join(PACKAGES_DIR, dir, 'package.json'), 'utf-8'),
      ) as Manifest;
      return { name: manifest.name ?? dir, manifest };
    })
    .filter(({ manifest }) => !manifest.private);
}

describe('SDK peer dependencies', () => {
  it('finds plugin manifests to check', () => {
    // A rename that emptied this list would otherwise make every assertion
    // below pass by iterating nothing.
    expect(pluginManifests().length).toBeGreaterThan(10);
  });

  it('every SDK peer is optional', () => {
    const required: string[] = [];
    for (const { name, manifest } of pluginManifests()) {
      for (const dep of Object.keys(manifest.peerDependencies ?? {})) {
        if (RUNTIME.has(dep)) continue;
        if (!manifest.peerDependenciesMeta?.[dep]?.optional) {
          required.push(`${name} → ${dep}`);
        }
      }
    }
    expect(
      required,
      'these peers force every adopter to install an SDK they may not use',
    ).toEqual([]);
  });

  it('every SDK peer is bounded by major version', () => {
    const unbounded: string[] = [];
    for (const { name, manifest } of pluginManifests()) {
      for (const [dep, range] of Object.entries(manifest.peerDependencies ?? {})) {
        if (RUNTIME.has(dep)) continue;
        // What matters is whether the range has an upper bound, not how it
        // starts. `">=0.1.0 <1.0.0"` is bounded and correct for a 0.x SDK —
        // an earlier version of this check read only the first characters and
        // flagged three such ranges, which is the same mistake the rules make.
        // Every `||` alternative must be bounded on its own. Testing the
        // whole string lets `"^4.8.4 || >=5.0.0"` pass on the caret in the
        // first alternative while the second still admits any future major.
        const bounded = range
          .split('||')
          .map((part) => part.trim())
          .every(
            (part) =>
              part.length > 0 &&
              part !== '*' &&
              part !== 'latest' &&
              (/[\^~]/.test(part) || /<\s*\d/.test(part)),
          );
        if (!bounded) {
          unbounded.push(`${name} → ${dep}: "${range}"`);
        }
      }
    }
    expect(
      unbounded,
      'a support range must name the majors we have actually tested',
    ).toEqual([]);
  });

  it('declares no framework or SDK peer: only the host and the named exceptions', () => {
    // Every plugin matches the libraries it lints by the import specifier in
    // the linted code, so none needs the package installed. The 48 framework
    // peers (express, jsonwebtoken, react, @prisma/client, ...) were never
    // imported by any `src` file; they existed only so npm could warn on a
    // version mismatch. That is not worth a third-party name in the published
    // dependency graph (PRINCIPLES.md rule 2: zero external dependencies), so
    // the supported library ranges now live in each README's "Supported
    // library versions" list. Do not add a peer back: add the range there.
    //
    // The exceptions are NOT framework peers. Each does runtime work today and
    // is scheduled for replacement in the zero-dependency plan
    // (docs: ventures zero-deps audit, "Removal order" steps 4 to 6), so the
    // allowlist should only ever shrink.
    const allowed: Record<string, string[]> = {
      'eslint-devkit': ['oxc-resolver', 'typescript'],
      'eslint-plugin-import-next': ['oxc-resolver', 'typescript'],
      'eslint-plugin-maintainability': ['typescript'],
      'eslint-plugin-react-features': ['typescript'],
      'eslint-plugin-secure-coding': ['recheck'],
    };
    const unexpected: string[] = [];
    for (const dir of readdirSync(PACKAGES_DIR)) {
      let manifest: Manifest;
      try {
        manifest = manifestOf(dir);
      } catch {
        continue;
      }
      if (manifest.private) continue;
      const ok = new Set([...HOSTS, ...(allowed[dir] ?? [])]);
      for (const dep of Object.keys(manifest.peerDependencies ?? {})) {
        if (!ok.has(dep)) unexpected.push(`${dir} → ${dep}`);
      }
    }
    expect(
      unexpected,
      'a published package must not declare a third-party peer; put the supported range in its README',
    ).toEqual([]);
  });

  it('every allowlisted exception is still a real peer', () => {
    // An exception that no longer exists is a stale allowance: it would let
    // the peer come back unnoticed. Remove the entry with the peer.
    const allowed: [string, string][] = [
      ['eslint-devkit', 'oxc-resolver'],
      ['eslint-devkit', 'typescript'],
      ['eslint-plugin-import-next', 'oxc-resolver'],
      ['eslint-plugin-import-next', 'typescript'],
      ['eslint-plugin-maintainability', 'typescript'],
      ['eslint-plugin-react-features', 'typescript'],
      ['eslint-plugin-secure-coding', 'recheck'],
    ];
    const gone = allowed
      .filter(([dir, dep]) => manifestOf(dir).peerDependencies?.[dep] === undefined)
      .map(([dir, dep]) => `${dir} → ${dep}`);
    expect(gone).toEqual([]);
  });
});
