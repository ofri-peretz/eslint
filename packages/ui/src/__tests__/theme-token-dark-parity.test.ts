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

/** Strip CSS block comments. Shared so every reader sees the same text. */
const stripComments = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Extract the body of a top-level `<selector> { ... }` block.
 *
 * Comments are stripped BEFORE counting, which is the whole reason this is not
 * a regex. Brace-counting over the raw text is wrong in a file whose blocks are
 * mostly prose: an unbalanced brace inside a comment moves the boundary. A `}`
 * in prose ends the block early — the reader then sees a truncated token set —
 * and a `{` in prose runs the counter off the end and throws "unterminated".
 * Both are reachable by writing an ordinary sentence about CSS syntax in a file
 * that exists to be commented.
 *
 * `literalColorTokens` already stripped comments before tokenising; this makes
 * the two agree instead of leaving one of them a step behind.
 */
function blockBody(selector: string, source: string = css): string {
  const stripped = stripComments(source);
  const start = stripped.indexOf(`${selector} {`);
  expect(start, `${selector} block is missing from theme.css`).toBeGreaterThan(-1);
  let depth = 0;
  let i = stripped.indexOf('{', start);
  const open = i;
  for (; i < stripped.length; i++) {
    if (stripped[i] === '{') depth++;
    else if (stripped[i] === '}') {
      depth--;
      if (depth === 0) return stripped.slice(open + 1, i);
    }
  }
  throw new Error(`${selector} block is unterminated`);
}

/** Custom properties whose value is a literal color, not a `var()` indirection. */
function literalColorTokens(body: string): Map<string, string> {
  const found = new Map<string, string>();
  // Strip comments first — the rationale prose quotes token values.
  const code = stripComments(body);
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

describe('blockBody survives braces in comment prose', () => {
  // Both cases were confirmed to break the pre-fix implementation before this
  // test was kept: the `}` case returned a truncated body, the `{` case threw.
  const withComment = (prose: string) =>
    `:root {\n  /* ${prose} */\n  --destructive: hsl(0, 72%, 38%);\n}\n\n.dark {\n  --destructive: hsl(0, 91%, 71%);\n}\n`;

  it.each([
    ['a closing } brace in prose', 'the } character ends a block'],
    ['an opening { brace in prose', 'an { character opens a block'],
    ['a balanced { } pair in prose', 'written as { } in full'],
  ])('reads the whole :root block despite %s', (_label, prose) => {
    expect(literalColorTokens(blockBody(':root', withComment(prose))).has('--destructive')).toBe(true);
  });

  it('still finds the .dark block after a comment brace', () => {
    const tokens = literalColorTokens(blockBody('.dark', withComment('ends with }')));
    expect(tokens.get('--destructive')).toBe('hsl(0, 91%, 71%)');
  });
});

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
