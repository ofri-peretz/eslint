import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Error Page Lock Tests
 *
 * error.tsx and global-error.tsx are the two pages nobody sees during normal
 * development, so regressions here surface only in front of a real user who
 * already hit a failure. Two classes of invariant are worth locking:
 *
 *  1. SECURITY — the page must never render `error.message` or `error.stack`.
 *     Next deliberately withholds those from the client in production and
 *     hands over an opaque `digest` instead; printing the message would leak
 *     server internals (paths, query fragments, upstream responses) onto a
 *     public page. This is the assertion that matters most.
 *  2. LAYOUT — `max-w-prose`, never `max-w-sm..2xl`, which the design-system
 *     spacing tokens shadow into a ~96px container.
 *
 * global-error.tsx additionally must stay dependency-free: it replaces the
 * root layout, so anything it imports is code that can itself throw while
 * handling a throw. It inlines the mark for exactly that reason.
 */

const APP_ROOT = resolve(__dirname, '../..');
const ERROR_PATH = join(APP_ROOT, 'src/app/error.tsx');
const GLOBAL_ERROR_PATH = join(APP_ROOT, 'src/app/global-error.tsx');

/** Utilities the DS spacing tokens shadow — see the interlace-theme spacing scale. */
const SHADOWED_MAX_W = [
  'max-w-sm',
  'max-w-md',
  'max-w-lg',
  'max-w-xl',
  'max-w-2xl',
];

/**
 * Renders of the raw error object that would leak server internals.
 *
 * Patterns, not literal strings: an exact-string list only catches the exact
 * spelling it was written for, and `{error?.message}`, `{error["message"]}`
 * and `{error.toString()}` are the same leak in different clothes.
 *
 * The `console.error(..., error)` call in the logging effect is deliberately
 * NOT matched — that goes to the browser console, not into the rendered page.
 */
const LEAKY_RENDER_PATTERNS: Array<[string, RegExp]> = [
  ['{error.message} / {error?.message}', /\{[^}]*\berror\s*\??\.\s*message\b/],
  ['{error.stack} / {error?.stack}', /\{[^}]*\berror\s*\??\.\s*stack\b/],
  [
    '{error["message"]} / {error["stack"]}',
    /\{[^}]*\berror\s*\[\s*['"](?:message|stack)['"]\s*\]/,
  ],
  ['{error.toString()}', /\{[^}]*\berror\s*\??\.\s*toString\s*\(/],
  ['{String(error)}', /\{[^}]*\bString\s*\(\s*error\b/],
  ['{`${error}`}', /\{\s*`[^`]*\$\{\s*error\s*\}/],
];

describe('error page lock', () => {
  let errorSource: string;
  let globalErrorSource: string;

  beforeAll(() => {
    errorSource = readFileSync(ERROR_PATH, 'utf8');
    globalErrorSource = readFileSync(GLOBAL_ERROR_PATH, 'utf8');
  });

  it.each([
    ['error.tsx', () => errorSource],
    ['global-error.tsx', () => globalErrorSource],
  ])('%s never renders the raw error message or stack', (_name, get) => {
    const source = get();
    for (const [label, pattern] of LEAKY_RENDER_PATTERNS) {
      expect(
        pattern.test(source),
        `${label} leaks server internals onto a public page — render error.digest instead`,
      ).toBe(false);
    }
    // The digest is the sanctioned, opaque handle.
    expect(source).toContain('error.digest');
  });

  it.each([
    ['error.tsx', () => errorSource],
    ['global-error.tsx', () => globalErrorSource],
  ])('%s uses max-w-prose and no DS-shadowed max-w utility', (_name, get) => {
    const source = get();
    expect(source).toContain('max-w-prose');

    // Collect the max-w tokens with ONE literal regex and compare sets, rather
    // than building a regex per class from a string. Same word-boundary effect
    // (max-w-xl can never match inside max-w-2xl), no dynamic RegExp.
    const used = new Set(
      [...source.matchAll(/\bmax-w-([a-z0-9-]+)\b/g)].map((m) => m[1]),
    );
    for (const cls of SHADOWED_MAX_W) {
      expect(
        used.has(cls.replace('max-w-', '')),
        `${cls} is shadowed by the DS spacing tokens and renders ~96px wide`,
      ).toBe(false);
    }
  });

  it('error.tsx is a client boundary that offers a retry', () => {
    expect(errorSource).toMatch(/^['"]use client['"]/m);
    expect(errorSource).toContain('reset');
    expect(errorSource).toContain('onClick={reset}');
  });

  it('global-error.tsx supplies its own document shell', () => {
    // It replaces the root layout, so without these the page renders nothing.
    expect(globalErrorSource).toContain('<html');
    expect(globalErrorSource).toContain('<body');

    // And its own <head>: Next injects nothing here, so a missing viewport
    // meta silently drops mobile browsers back to ~980px desktop-zoom
    // rendering — a broken-looking page on exactly the devices least able to
    // recover from one.
    expect(globalErrorSource).toContain('<head');
    // Two independent checks, not one regex: requiring `name` to precede
    // `content` in the same tag would go quietly false-negative the first
    // time a formatter reorders the props.
    expect(globalErrorSource).toContain('name="viewport"');
    expect(globalErrorSource).toContain('width=device-width');
  });

  it('global-error.tsx keeps the skip-link target', () => {
    // error.tsx and not-found.tsx both carry id="main"; dropping it here would
    // strand keyboard and screen-reader users on the one page they most need
    // to escape.
    expect(globalErrorSource).toContain('id="main"');
  });

  it('global-error.tsx stays dependency-free apart from its stylesheet', () => {
    const imports = [
      ...globalErrorSource.matchAll(/^import\s.*?from\s+['"](.+?)['"]/gm),
    ]
      .map((m) => m[1])
      .filter((spec) => !spec.endsWith('.css'));

    // A boundary that imports app code can throw while handling a throw —
    // which is why the mark is inlined here rather than imported.
    expect(
      imports,
      `global-error.tsx must not import app modules (found: ${imports.join(', ')})`,
    ).toEqual([]);
  });
});
