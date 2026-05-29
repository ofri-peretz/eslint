/**
 * Primitives MIN_VIEWPORT + client/server contract lock.
 *
 * WHY THIS LOCK EXISTS
 * --------------------
 * Per CLAUDE.md ("Regressions are the issue. Lock everything you fix.") any
 * structural invariant we care about must be pinned by a test that would have
 * caught the regression pre-deploy. DESIGN_PRINCIPLES #14 ("Every primitive
 * declares its minimum viewport") is one of those invariants: each Interlace
 * UI primitive must export a `MIN_VIEWPORT` constant AND project that value
 * onto the rendered root via a `data-min-viewport=` attribute so audits +
 * Storybook + lighthouse can flag a hostile component on a too-narrow screen.
 *
 * The companion contract — client-vs-server boundary — is just as load-bearing.
 * `'use client'` is invisible at runtime but flips the whole subtree into a
 * client bundle; a careless refactor that adds the directive to a server
 * primitive (or strips it from a client one) breaks RSC composition silently
 * (server primitive becomes un-tree-shakeable; client primitive throws at
 * import time inside an RSC). Both regressions ship without lighting up any
 * runtime test — they only show up in `next build` budgets or in a user's
 * browser — so we pin them statically here.
 *
 * Static source-parse (fs.readFileSync + regex) is intentional: this is a
 * structural lock, not a render test. We assert what the SOURCE says, not
 * what React renders, so a future refactor that moves the attribute into a
 * helper or memo can't accidentally launder past the check.
 *
 * If you add a new primitive that owns a viewport contract, append it here.
 * If you move one between client and server tiers, update the array AND the
 * matching `DESIGN_PRINCIPLES.md` row in the same PR.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Contract — the 9 primitives this lock covers.
//   - `name`     : filename (no extension) under packages/ui/src/primitives/
//   - `viewport` : the MIN_VIEWPORT value baked into the source (320|480|768)
//   - `tier`     : 'client' if the source starts with `'use client'`,
//                  'server' if it must NOT carry that directive.
// ---------------------------------------------------------------------------
const PRIMITIVES = [
  { name: 'form', viewport: 320, tier: 'server' },
  { name: 'textarea', viewport: 320, tier: 'server' },
  { name: 'toast', viewport: 320, tier: 'client' },
  { name: 'alert-dialog', viewport: 320, tier: 'client' },
  { name: 'progress', viewport: 320, tier: 'client' },
  { name: 'breadcrumb', viewport: 480, tier: 'server' },
  { name: 'aspect-ratio', viewport: 320, tier: 'server' },
  { name: 'collapsible', viewport: 320, tier: 'client' },
  { name: 'hover-card', viewport: 768, tier: 'client' },
  { name: 'slider', viewport: 320, tier: 'client' },
  { name: 'toggle', viewport: 320, tier: 'client' },
  { name: 'number-field', viewport: 320, tier: 'client' },
] as const;

// Allowed viewport floors. Keep in lock-step with DESIGN_PRINCIPLES #14.
const ALLOWED_VIEWPORTS = [320, 480, 768] as const;

const readPrimitive = (name: string): string => {
  const absolute = resolve(
    __dirname,
    '../../../../packages/ui/src/primitives',
    `${name}.tsx`,
  );
  return readFileSync(absolute, 'utf-8');
};

// Strip block comments + line comments before checking for the `'use client'`
// pragma so a docs-only mention inside a JSDoc header can't fool the test.
// Real directives are always the FIRST non-whitespace token in the file, so
// after comment-stripping we can simply look at the first statement.
const stripComments = (source: string): string =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
    .replace(/^\s*\/\/.*$/gm, ''); // line comments

const hasUseClientDirective = (source: string): boolean => {
  const stripped = stripComments(source).trimStart();
  return /^["']use client["'];?/.test(stripped);
};

for (const { name, viewport, tier } of PRIMITIVES) {
  describe(`primitive: ${name}`, () => {
    const source = readPrimitive(name);

    // -----------------------------------------------------------------------
    // 1. MIN_VIEWPORT export + allowed literal (DESIGN_PRINCIPLES #14)
    // -----------------------------------------------------------------------
    it('exports a `MIN_VIEWPORT` constant', () => {
      expect(source).toMatch(/export\s+const\s+MIN_VIEWPORT\b/);
    });

    it(`pins MIN_VIEWPORT to the expected literal (${viewport})`, () => {
      // Look for `export const MIN_VIEWPORT = <number>` allowing optional
      // type annotation and trailing `as const`.
      const match = source.match(
        /export\s+const\s+MIN_VIEWPORT(?:\s*:\s*\w+)?\s*=\s*(\d+)\b/,
      );
      expect(match, 'MIN_VIEWPORT export not found').not.toBeNull();
      const literal = Number(match![1]);
      expect(ALLOWED_VIEWPORTS).toContain(literal as 320 | 480 | 768);
      expect(literal).toBe(viewport);
    });

    // -----------------------------------------------------------------------
    // 2. `data-min-viewport=` projected onto the rendered tree
    // -----------------------------------------------------------------------
    it('projects MIN_VIEWPORT onto the JSX via `data-min-viewport=`', () => {
      expect(source).toContain('data-min-viewport=');
    });

    // -----------------------------------------------------------------------
    // 3. Client / server tier — the `'use client'` directive contract
    // -----------------------------------------------------------------------
    if (tier === 'client') {
      it("declares the `'use client'` directive (client tier)", () => {
        expect(hasUseClientDirective(source)).toBe(true);
      });
    } else {
      it("does NOT declare the `'use client'` directive (server tier)", () => {
        expect(hasUseClientDirective(source)).toBe(false);
      });
    }
  });
}
