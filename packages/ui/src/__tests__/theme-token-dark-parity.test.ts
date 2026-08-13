/**
 * Dark-mode parity lock for literal color tokens in `styles/theme.css`.
 *
 * `--destructive` was given one literal value in `:root` — hsl(0,72%,38%),
 * picked to pass on white — and no `.dark` counterpart, so dark mode painted
 * a light-mode red onto a near-black surface. Measured on the live site, the
 * "Clear filters" control came out at 2.36:1 against a 4.5:1 requirement
 * (#527). The `.dark` block right beside it lifts every `--chart-*` hue for
 * exactly this reason; `--destructive` was simply missed.
 *
 * The bug class is narrow enough to lock structurally: a token whose `:root`
 * value is a *literal* color is theme-blind by construction. Tokens defined
 * as `var(--color-fd-*)` are not — they follow whatever the consuming app
 * sets per theme — so they are out of scope here.
 *
 * Structural, against the stylesheet source: no build, no jsdom, no browser.
 * It cannot tell you a contrast ratio, and it is not trying to — it tells you
 * a literal color was declared once and never reconsidered for dark mode,
 * which is the step that was actually skipped.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const PKG_ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../..');
const css = fs.readFileSync(path.join(PKG_ROOT, 'styles/theme.css'), 'utf8');

/**
 * Tokens whose light value is deliberately correct in dark mode too. Each
 * entry carries the reason, following the grandfathering convention the
 * plugin-taxonomy gate already uses — an unexplained exemption is how the
 * next `--destructive` gets waved through.
 */
const INTENTIONALLY_THEME_INVARIANT = new Map([
  [
    '--destructive-foreground',
    'White on the destructive fill. The solid variants carry `dark:bg-destructive/60`, which composites the dark red to rgb(159,78,78) — 5.7:1 under white — so the foreground is correct in both themes.',
  ],
  [
    '--color-destructive-foreground',
    'Tailwind v4 alias of --destructive-foreground; same reasoning.',
  ],
]);

/** Extract the body of a top-level `<selector> { ... }` block. */
function blockBody(selector: string): string {
  // Brace-counting rather than a lazy regex: the blocks contain nested
  // comments with braces in prose, and `[^}]*` stops at the first one.
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} block is missing from theme.css`).toBeGreaterThan(-1);
  let depth = 0;
  let i = css.indexOf('{', start);
  const open = i;
  for (; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error(`${selector} block is unterminated`);
}

/** Custom properties whose value is a literal color, not a `var()` indirection. */
function literalColorTokens(body: string): Map<string, string> {
  const found = new Map<string, string>();
  // Strip comments first — the rationale prose quotes token values.
  const code = body.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const line of code.split('\n')) {
    const m = line.match(/^\s*(--[\w-]+)\s*:\s*([^;]+);/);
    if (!m) continue;
    const [, name, value] = m;
    if (/^(hsl|rgb|oklch|lab|lch|color|#)/i.test(value.trim())) found.set(name, value.trim());
  }
  return found;
}

const rootLiterals = literalColorTokens(blockBody(':root'));
const darkLiterals = literalColorTokens(blockBody('.dark'));

describe('literal color tokens are reconsidered for dark mode', () => {
  it('finds literal color tokens to check (the parse itself is not silently empty)', () => {
    // A regex that matched nothing would make every assertion below vacuous —
    // the failure mode where a green test proves the parser broke.
    expect(rootLiterals.size).toBeGreaterThan(5);
    expect(rootLiterals.has('--destructive')).toBe(true);
  });

  it.each([...rootLiterals.keys()])(
    '%s is overridden in .dark, or documented as theme-invariant',
    (token) => {
      if (darkLiterals.has(token)) {
        expect(darkLiterals.get(token)).not.toBe(rootLiterals.get(token));
        return;
      }
      const reason = INTENTIONALLY_THEME_INVARIANT.get(token);
      expect(
        reason,
        `${token} is a literal color declared only in :root, so dark mode renders the light-mode value. ` +
          `Add a .dark override, or add it to INTENTIONALLY_THEME_INVARIANT with the reason it is correct in both themes.`,
      ).toBeTruthy();
    },
  );

  it('carries no stale exemptions', () => {
    // An exemption for a token that has since gained a .dark override, or was
    // deleted, reads as a considered decision while guarding nothing.
    for (const token of INTENTIONALLY_THEME_INVARIANT.keys()) {
      expect(rootLiterals.has(token), `${token} is exempted but no longer declared in :root`).toBe(true);
      expect(darkLiterals.has(token), `${token} is exempted but now has a .dark override`).toBe(false);
    }
  });
});
