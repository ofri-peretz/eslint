/**
 * Keyboard affordances lock
 *
 * Locks the keyboard-accessibility contract codified in
 * `KEYBOARD_PHILOSOPHY.md`:
 *
 *   #1 — Every page has a skip link as its first focusable element,
 *        targeting `#main-content`.
 *   #2 — Every interactive control is reachable via Tab (no `<div onClick>`,
 *        no `<span onClick>` in apps/docs source).
 *   #5 — Tab order matches reading order (no `tabIndex > 0` anywhere).
 *
 * These are source-text assertions matching the existing lock-test
 * convention (`homepage-lock.test.tsx`,
 * `shimmer-button-effects-lock.test.tsx`). A regression that drops the
 * skip link, removes the main-content id from a page, or introduces a
 * non-reachable interactive element breaks CI rather than reaching
 * production.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

// Use __dirname so this works regardless of whether vitest is invoked from the
// repo root (npx vitest run apps/docs/…) or from apps/docs (turbo run test).
const ROOT = resolve(__dirname, '../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf-8');
}

describe('Keyboard affordances — root layout skip link (#1)', () => {
  let layoutSource: string;

  beforeAll(() => {
    layoutSource = read('src/app/layout.tsx');
  });

  it('renders an "Skip to main content" anchor', () => {
    expect(layoutSource).toContain('Skip to main content');
  });

  it('the skip anchor targets `#main-content`', () => {
    expect(layoutSource).toContain('href="#main-content"');
  });

  it('the skip anchor uses `sr-only` + `focus:not-sr-only` so it is visually hidden until focused', () => {
    expect(layoutSource).toContain('sr-only');
    expect(layoutSource).toContain('focus:not-sr-only');
  });

  it('the skip anchor sits before <RootProvider> so it is the first focusable element in <body>', () => {
    const skipIdx = layoutSource.indexOf('href="#main-content"');
    const providerIdx = layoutSource.indexOf('<RootProvider');
    expect(skipIdx).toBeGreaterThan(-1);
    expect(providerIdx).toBeGreaterThan(-1);
    expect(skipIdx).toBeLessThan(providerIdx);
  });
});

describe('Keyboard affordances — every page exposes `id="main-content"` (#1 target)', () => {
  it('home page outer wrapper carries `id="main-content"`', () => {
    const src = read('src/app/(home)/page.tsx');
    expect(src).toContain('id="main-content"');
  });

  it('articles page outer wrapper carries `id="main-content"`', () => {
    const src = read('src/app/articles/page.tsx');
    expect(src).toContain('id="main-content"');
  });

  it('docs layout carries `id="main-content"` on the <main> landmark', () => {
    const src = read('src/app/docs/layout.tsx');
    expect(src).toContain('id="main-content"');
  });

  it('home + articles wrappers use `tabIndex={-1}` so the skip-link focus actually lands', () => {
    expect(read('src/app/(home)/page.tsx')).toContain('tabIndex={-1}');
    expect(read('src/app/articles/page.tsx')).toContain('tabIndex={-1}');
  });
});

describe('Keyboard affordances — no non-reachable interactive surfaces (#2)', () => {
  // Walk the entire src/ tree and assert that no .tsx file pairs `onClick`
  // with a `<div>` or `<span>` opener. Real `<button>` / `<a>` are fine;
  // it's only the non-focusable elements we forbid.
  function* walkTsx(dir: string): Generator<string> {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        if (entry === '__tests__' || entry === 'node_modules' || entry === '.next') continue;
        yield* walkTsx(full);
      } else if (entry.endsWith('.tsx')) {
        yield full;
      }
    }
  }

  it('no `<div onClick>` patterns in apps/docs/src', () => {
    const offenders: string[] = [];
    for (const file of walkTsx(join(ROOT, 'src'))) {
      const src = readFileSync(file, 'utf-8');
      if (/<div[^>]*\bonClick=/.test(src)) {
        offenders.push(file.replace(ROOT + '/', ''));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no `<span onClick>` patterns in apps/docs/src', () => {
    const offenders: string[] = [];
    for (const file of walkTsx(join(ROOT, 'src'))) {
      const src = readFileSync(file, 'utf-8');
      if (/<span[^>]*\bonClick=/.test(src)) {
        offenders.push(file.replace(ROOT + '/', ''));
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('Keyboard affordances — Tab order matches reading order (#5)', () => {
  // `tabIndex > 0` creates a parallel ordering layered on top of the DOM
  // and almost always produces surprising tab paths. Only `0` and `-1`
  // are allowed.
  function* walkTsx(dir: string): Generator<string> {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        if (entry === '__tests__' || entry === 'node_modules' || entry === '.next') continue;
        yield* walkTsx(full);
      } else if (entry.endsWith('.tsx')) {
        yield full;
      }
    }
  }

  it('no `tabIndex={N}` with N > 0 anywhere in apps/docs/src', () => {
    const offenders: string[] = [];
    const positiveTabIndex = /tabIndex=\{(\d+)\}/g;
    for (const file of walkTsx(join(ROOT, 'src'))) {
      const src = readFileSync(file, 'utf-8');
      let m: RegExpExecArray | null;
      while ((m = positiveTabIndex.exec(src)) !== null) {
        const value = Number(m[1]);
        if (value > 0) offenders.push(`${file.replace(ROOT + '/', '')}: tabIndex={${value}}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
