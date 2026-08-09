/**
 * Export-map integrity lock for @interlace/ui.
 *
 * This package had no test task at all — it is consumed by docs, storybook and
 * registry, and nothing in CI verified it. Its highest-value failure mode is
 * not a rendering bug but export-map drift: an `exports` subpath pointing at a
 * `dist/` artifact whose source no longer exists, which makes the subpath
 * silently uninstallable for every consumer while the build still succeeds.
 *
 * Deliberately structural, against `src/` rather than `dist/`: it needs no
 * build step, no jsdom, and no testing-library, so it runs in milliseconds and
 * cannot go stale relative to a cached build.
 *
 * Component-behaviour tests are a separate, larger piece of work — this lock
 * exists so the package stops being invisible to CI in the meantime.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const PKG_ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../..');
const manifestRaw = fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8');
const manifest = JSON.parse(manifestRaw) as {
  exports: Record<string, string | { types?: string; default?: string }>;
};

it('declares no duplicate exports subpaths', () => {
  // `JSON.parse` silently keeps the last of a duplicated key, so this has to
  // read raw text. `./breadcrumb` and `./progress` were each declared twice
  // before this lock existed — harmless while the values matched, but the day
  // they diverge the manifest means something different from how it reads.
  // No indentation anchor: `^\s{4}` would silently match nothing the day
  // Prettier reformats package.json, leaving `declared` empty and this test
  // green having checked nothing — the exact failure mode this file exists to
  // catch. `exports` is the only field with `./` keys, and values can't match
  // because the pattern requires a `:` right after the closing quote.
  const declared = [...manifestRaw.matchAll(/"(\.\/[^"]+)":/g)].map((m) => m[1]);
  // Guard the guard, on `declared` itself rather than the parsed map, so a
  // regex that stops matching fails loudly instead of passing vacuously.
  expect(declared.length, 'duplicate-key regex matched nothing — check the manifest format').toBeGreaterThan(20);
  const seen = new Set<string>();
  const dupes = declared.filter((k) => (seen.has(k) ? true : (seen.add(k), false)));
  expect(dupes).toEqual([]);
});

/** `./dist/primitives/button.js` -> the source file that must produce it. */
function sourceCandidates(distPath: string): string[] {
  const rel = distPath.replace(/^\.\//, '').replace(/^dist\//, '');
  const stem = rel.replace(/\.d\.ts$/, '').replace(/\.js$/, '');
  return [`src/${stem}.tsx`, `src/${stem}.ts`];
}

const entries = Object.entries(manifest.exports);

it('declares a non-trivial export map', () => {
  // Guards the guard: if `exports` were emptied or renamed, every `it.each`
  // below would vanish and the suite would pass having checked nothing.
  expect(entries.length).toBeGreaterThan(20);
});

describe('every exports subpath resolves to a real source file', () => {
  const checks: { subpath: string; target: string }[] = [];

  for (const [subpath, value] of entries) {
    // Wildcard subpaths (`./magicui/*`) resolve per-import; assert the
    // directory exists rather than trying to enumerate every consumer's usage.
    if (subpath.includes('*')) continue;
    if (typeof value === 'string') checks.push({ subpath, target: value });
    else {
      if (value.types) checks.push({ subpath: `${subpath} (types)`, target: value.types });
      if (value.default) checks.push({ subpath: `${subpath} (default)`, target: value.default });
    }
  }

  it.each(checks)('$subpath -> $target', ({ target }) => {
    // Non-dist targets (styles/*.css) ship verbatim and must exist as declared.
    if (!target.replace(/^\.\//, '').startsWith('dist/')) {
      expect(fs.existsSync(path.join(PKG_ROOT, target.replace(/^\.\//, '')))).toBe(true);
      return;
    }
    const found = sourceCandidates(target).some((c) => fs.existsSync(path.join(PKG_ROOT, c)));
    expect(found, `no source file for ${target}; tried ${sourceCandidates(target).join(' or ')}`).toBe(true);
  });
});

describe('wildcard export directories exist', () => {
  const wildcards = entries.filter(([subpath]) => subpath.includes('*')).map(([subpath]) => subpath);

  it.each(wildcards)('%s', (subpath) => {
    const dir = subpath.replace(/^\.\//, '').replace(/\/\*$/, '');
    expect(fs.existsSync(path.join(PKG_ROOT, 'src', dir))).toBe(true);
  });
});
