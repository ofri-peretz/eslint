/**
 * Locks for the runtime-dependency gate.
 *
 * These three functions are the entire reason two production breaks are now
 * catchable, and the plausible "tidy-ups" of each are exactly what would let the
 * breaks back through:
 *
 *   - tightening the eager-require pattern's `.*?` to `= ` stops matching
 *     `__importDefault(require("x"))` — the precise miss that let the
 *     import-next break past the first version of this check
 *   - inverting `meta[p]?.optional !== true` turns the devkit's optional-peer
 *     trap back into a pass
 *
 * Each case below is written so that mutation fails it.
 */
import { describe, it, expect } from 'vitest';
import {
  BUILTINS,
  allRequires,
  eagerRequires,
  guaranteed,
  packageOf,
  type Manifest,
  unusedDependencies,
  violationsIn,
} from '../lib/runtime-deps';

describe('packageOf', () => {
  it('reduces a deep specifier to its package', () => {
    expect(packageOf('typescript')).toBe('typescript');
    expect(packageOf('pkg/deep/path')).toBe('pkg');
    expect(packageOf('@scope/pkg')).toBe('@scope/pkg');
    expect(packageOf('@typescript-eslint/utils/ts-eslint')).toBe(
      '@typescript-eslint/utils',
    );
  });

  it('ignores relative and absolute specifiers — those ship with the package', () => {
    expect(packageOf('./rules/named')).toBeNull();
    expect(packageOf('../utils/typescript-peer')).toBeNull();
    expect(packageOf('/abs/path')).toBeNull();
  });
});

describe('guaranteed', () => {
  it('counts dependencies and the package itself', () => {
    const m: Manifest = { name: 'me', dependencies: { tslib: '^2' } };
    expect([...guaranteed(m)].sort()).toEqual(['me', 'tslib']);
  });

  it('counts a non-optional peer — npm 7+ auto-installs those', () => {
    const m: Manifest = { peerDependencies: { eslint: '^9' } };
    expect(guaranteed(m).has('eslint')).toBe(true);
  });

  it('EXCLUDES an optional peer — npm does not install those', () => {
    // The devkit trap, exactly: declared as a peer, marked optional, imported
    // as a runtime value. Inverting this guard re-arms the outage.
    const m: Manifest = {
      peerDependencies: { '@typescript-eslint/utils': '^8' },
      peerDependenciesMeta: { '@typescript-eslint/utils': { optional: true } },
    };
    expect(guaranteed(m).has('@typescript-eslint/utils')).toBe(false);
  });
});

describe('eagerRequires', () => {
  it('matches a plain named import', () => {
    expect(eagerRequires('const x_1 = require("pkg");')).toEqual(['pkg']);
  });

  it('matches a default import through __importDefault', () => {
    // tsc's emit for `import ts from 'typescript'`. An anchor of `= require(`
    // misses this — and that is how the import-next break got through.
    expect(
      eagerRequires(
        'const typescript_1 = tslib_1.__importDefault(require("typescript"));',
      ),
    ).toEqual(['typescript']);
  });

  it('matches a destructured require', () => {
    expect(
      eagerRequires(
        'const { createRule } = require("@typescript-eslint/utils");',
      ),
    ).toEqual(['@typescript-eslint/utils']);
  });

  it('matches a side-effect-only require', () => {
    expect(eagerRequires('require("polyfill");')).toEqual(['polyfill']);
  });

  it('matches single-quoted specifiers', () => {
    expect(eagerRequires("const a_1 = require('pkg');")).toEqual(['pkg']);
  });

  it('IGNORES an indented require — a deliberate lazy load', () => {
    // resolver.ts and typescript-peer.ts both try/catch a missing optional peer
    // into a typed result. Flagging these would fail the pattern this gate
    // recommends as the fix.
    const lazy = [
      'function load() {',
      '  try {',
      '    cached = require("oxc-resolver");',
      '  } catch { cached = null; }',
      '}',
    ].join('\n');
    expect(eagerRequires(lazy)).toEqual([]);
  });

  it('finds every module-scope require in a file', () => {
    const source = [
      'const a_1 = require("alpha");',
      'const b_1 = tslib_1.__importDefault(require("beta"));',
      'const { c } = require("gamma");',
    ].join('\n');
    expect(eagerRequires(source)).toEqual(['alpha', 'beta', 'gamma']);
  });
});

describe('violationsIn', () => {
  const manifest: Manifest = {
    name: 'eslint-plugin-example',
    dependencies: { tslib: '^2' },
    peerDependencies: { eslint: '^9', 'opt-peer': '^1' },
    peerDependenciesMeta: { 'opt-peer': { optional: true } },
  };

  it('passes builtins, relatives, dependencies and required peers', () => {
    const source = [
      'const fs_1 = require("node:fs");',
      'const path_1 = require("path");',
      'const rel_1 = require("./local");',
      'const tslib_1 = require("tslib");',
      'const eslint_1 = require("eslint");',
    ].join('\n');
    expect(violationsIn(source, manifest, 'index.js')).toEqual([]);
  });

  it('flags an optional peer, naming it as such', () => {
    const [v] = violationsIn(
      'const o_1 = require("opt-peer");',
      manifest,
      'index.js',
    );
    expect(v?.specifier).toBe('opt-peer');
    expect(v?.reason).toMatch(/OPTIONAL peer/);
  });

  it('flags a wholly undeclared module', () => {
    const [v] = violationsIn(
      'const t_1 = require("typescript");',
      manifest,
      'rules/named.js',
    );
    expect(v?.specifier).toBe('typescript');
    expect(v?.reason).toMatch(/not declared/);
    expect(v?.file).toBe('rules/named.js');
  });
});

describe('BUILTINS', () => {
  it('covers both bare and node:-prefixed names', () => {
    expect(BUILTINS.has('fs')).toBe(true);
    expect(BUILTINS.has('node:fs')).toBe(true);
    expect(BUILTINS.has('typescript')).toBe(false);
  });
});

describe('allRequires', () => {
  it('sees a lazy require that eagerRequires deliberately ignores', () => {
    const src = [
      'function load() {',
      '  return require("oxc-resolver").ResolverFactory;',
      '}',
    ].join('\n');
    expect(eagerRequires(src)).toEqual([]);
    expect(allRequires(src)).toEqual(['oxc-resolver']);
  });

  it('sees module-scope requires too', () => {
    expect(allRequires('const a = require("pkg");')).toEqual(['pkg']);
  });
});

describe('unusedDependencies', () => {
  const manifest = { name: 'p', dependencies: { used: '1', dead: '1' } };

  it('reports a dependency nothing loads', () => {
    const out = unusedDependencies(manifest, ['used']);
    expect(out.map((u) => u.dependency)).toEqual(['dead']);
  });

  it('counts a lazily-required dependency as used', () => {
    expect(unusedDependencies(manifest, ['used', 'dead'])).toEqual([]);
  });

  it('does not report a dependency that satisfies a peer of another dependency', () => {
    // The tslib shape: every plugin declared it to satisfy devkit's peer, and
    // no plugin's own code required it. Reporting that would have been wrong.
    const peers = new Map([['used', new Set(['dead'])]]);
    expect(unusedDependencies(manifest, ['used'], peers)).toEqual([]);
  });

  it('resolves subpath specifiers to their package root', () => {
    const m = { name: 'p', dependencies: { '@scope/pkg': '1' } };
    expect(unusedDependencies(m, ['@scope/pkg/deep/thing'])).toEqual([]);
  });

  it('never reports peerDependencies — an optional peer is meant to be absent', () => {
    const m = {
      name: 'p',
      peerDependencies: { typescript: '*' },
      peerDependenciesMeta: { typescript: { optional: true } },
    };
    expect(unusedDependencies(m, [])).toEqual([]);
  });
});

describe('unusedDependencies — private packages', () => {
  it('reports nothing for a private package', () => {
    // The cost is "weight every consumer installs"; a package that never
    // reaches npm has no consumers. @interlace/eslint-config aggregates
    // plugins it does not import, which is correct for a workspace config.
    const m = { name: 'p', private: true, dependencies: { dead: '1' } };
    expect(unusedDependencies(m, [])).toEqual([]);
  });

  it('still reports for a published package', () => {
    const m = { name: 'p', dependencies: { dead: '1' } };
    expect(unusedDependencies(m, []).map((u) => u.dependency)).toEqual([
      'dead',
    ]);
  });
});
