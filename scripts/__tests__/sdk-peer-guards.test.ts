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
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PACKAGES_DIR = join(__dirname, '../../packages');

interface Manifest {
  name?: string;
  private?: boolean;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}

/** The runtime, not an SDK — it is legitimately required. */
const RUNTIME = new Set(['eslint']);

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

  it('React-specific plugins declare a react peer', () => {
    // Scoped to the plugins whose whole subject is React. A generic plugin
    // that happens to visit a JSX node — `conventions` checking naming inside
    // a component, say — should not be made to demand React of every adopter.
    const missing: string[] = [];
    for (const dir of readdirSync(PACKAGES_DIR).filter((d) =>
      d.startsWith('eslint-plugin-react'),
    )) {
      const rulesDir = join(PACKAGES_DIR, dir, 'src', 'rules');
      let handlesJsx = false;
      const walk = (p: string): void => {
        for (const entry of readdirSync(p, { withFileTypes: true })) {
          const child = join(p, entry.name);
          if (entry.isDirectory()) walk(child);
          else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
            if (/JSX(Element|Attribute|OpeningElement)\b/.test(readFileSync(child, 'utf-8'))) {
              handlesJsx = true;
            }
          }
        }
      };
      try {
        walk(rulesDir);
      } catch {
        continue;
      }
      if (!handlesJsx) continue;

      const manifest = JSON.parse(
        readFileSync(join(PACKAGES_DIR, dir, 'package.json'), 'utf-8'),
      ) as Manifest;
      if (!manifest.peerDependencies?.react) missing.push(dir);
    }
    expect(missing, 'these plugins lint JSX but name no React version').toEqual([]);
  });
});
