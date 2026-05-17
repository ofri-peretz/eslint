/**
 * Breakpoint contract lock — see /BREAKPOINTS.md at the repo root.
 *
 * This file is a synchronised copy across:
 *   - eslint/apps/docs
 *   - agents/apps/interlace-landing
 *   - serverless/apps/docs
 *
 * Edit ONE copy and propagate the diff to the other two — divergence
 * between copies is the bug this test exists to prevent. Same for the
 * sibling /BREAKPOINTS.md docs.
 *
 * What's locked:
 *   1. No `--breakpoint-` overrides in any `.css` under `src/`
 *      (Tailwind v4 lets you redefine the scale via `@theme inline`;
 *       we refuse to use that on any app).
 *   2. No `min-[Xpx]:` / `max-[Xpx]:` viewport arbitrary variants in
 *      source (`.ts` / `.tsx` / `.css`). Container queries `@min-[…]`
 *      and `@max-[…]` are fine — they carry the leading `@` and are
 *      not viewport breakpoints.
 *   3. The app's `package.json` pins `tailwindcss` (and the matching
 *      `@tailwindcss/postcss`) to `^4.1.18` or higher — a bare `^4`
 *      range can drift to a future minor that changes default screens.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';

const PROJECT_ROOT = process.cwd();
const SRC_DIR = join(PROJECT_ROOT, 'src');
const PACKAGE_JSON_PATH = join(PROJECT_ROOT, 'package.json');

const collectFiles = (dir: string, extensions: readonly string[]): readonly string[] => {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (entry === 'node_modules' || entry === '.next' || entry === 'dist') continue;
        walk(full);
      } else if (extensions.includes(extname(entry))) {
        out.push(full);
      }
    }
  };
  walk(dir);
  return out;
};

const cssFiles = collectFiles(SRC_DIR, ['.css']);
const sourceFiles = collectFiles(SRC_DIR, ['.ts', '.tsx', '.css']);

describe('Breakpoint contract (BREAKPOINTS.md)', () => {
  it('no `.css` file under src/ overrides `--breakpoint-*` (Tailwind v4 defaults are the contract)', () => {
    const offenders: string[] = [];
    for (const file of cssFiles) {
      const source = readFileSync(file, 'utf-8');
      if (/--breakpoint-(?:sm|md|lg|xl|2xl)\s*:/.test(source)) {
        offenders.push(file);
      }
    }
    expect(
      offenders,
      `Found custom --breakpoint-* declarations. BREAKPOINTS.md forbids these.\n` +
        `Offending files:\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });

  it('no source file uses `min-[Xpx]:` or `max-[Xpx]:` viewport arbitrary variants', () => {
    // Viewport arbitraries look like `min-[920px]:flex` or `max-[640px]:hidden`.
    // Container queries (`@min-[…]:`, `@max-[…]:`) are different — they carry
    // a leading `@` and are explicitly allowed.
    const PATTERN = /(?<![@\w])(?:min|max)-\[\d+(?:\.\d+)?px\]:/;
    const offenders: Array<{ file: string; matches: string[] }> = [];
    for (const file of sourceFiles) {
      const source = readFileSync(file, 'utf-8');
      // Strip comments so doc-strings can reference forbidden patterns
      // without tripping the lock.
      const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      const matches = stripped.match(new RegExp(PATTERN, 'g'));
      if (matches && matches.length > 0) {
        offenders.push({ file, matches });
      }
    }
    expect(
      offenders,
      `Found viewport arbitrary breakpoints. Use sm/md/lg/xl/2xl per BREAKPOINTS.md.\n` +
        offenders.map((o) => `  ${o.file}: ${o.matches.join(', ')}`).join('\n'),
    ).toEqual([]);
  });

  it('package.json pins `tailwindcss` to ^4.1.18 or higher (no bare `^4`)', () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    const deps: Record<string, string> = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    const range = deps['tailwindcss'];
    expect(range, 'tailwindcss is not listed in this app').toBeTruthy();
    // Acceptable: ^4.1.18 (or higher minor/patch), ^4.2.0, ^5.x, ~4.1.18, 4.1.18 exact.
    // Forbidden: ^4, ^4.0.0, ^4.1.0 — too loose / too old.
    // Pattern requires major.minor.patch with major ≥ 4 and not the `^4` bareword.
    const isPinnedEnough = /^[\^~]?(?:4\.(?:[2-9]|\d{2,})\.\d+|4\.1\.(?:1[89]|[2-9]\d*|\d{2,})|[5-9]\.\d+\.\d+|\d{2,}\.\d+\.\d+)$/.test(
      range,
    );
    expect(
      isPinnedEnough,
      `tailwindcss range "${range}" is too loose. Pin to ^4.1.18 or higher per BREAKPOINTS.md.`,
    ).toBe(true);
  });

  it('package.json pins `@tailwindcss/postcss` to the same floor', () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    const deps: Record<string, string> = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    const range = deps['@tailwindcss/postcss'];
    // Some apps don't ship the postcss plugin directly (it can come via a
    // workspace dep). Skip the assertion when absent — the tailwindcss
    // range itself is the hard gate.
    if (!range) return;
    const isPinnedEnough = /^[\^~]?(?:4\.(?:[2-9]|\d{2,})\.\d+|4\.1\.(?:1[89]|[2-9]\d*|\d{2,})|[5-9]\.\d+\.\d+|\d{2,}\.\d+\.\d+)$/.test(
      range,
    );
    expect(
      isPinnedEnough,
      `@tailwindcss/postcss range "${range}" is too loose. Pin to ^4.1.18 or higher per BREAKPOINTS.md.`,
    ).toBe(true);
  });
});
