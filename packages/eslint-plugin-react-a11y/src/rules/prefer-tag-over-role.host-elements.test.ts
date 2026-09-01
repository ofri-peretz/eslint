/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `prefer-tag-over-role` reports on DOM elements, and not on `<svg role="img">`.
 *
 * A census of all 31 findings on the pinned corpus found **31 false positives**:
 *
 *   23  `<svg role="img">`   — the recommended pattern for inline SVG
 *    5  `<Box role="img">`   — an MUI component, not a DOM element
 *    3  `<MuiLink role="link">` / `<LinkMui>` — likewise
 *
 * The report cases come first. This rule has a real job — `<div role="img">`
 * and `<span role="link">` should be `<img>` and `<a>` — and the guards must
 * not cost that.
 */

import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { preferTagOverRole } from './prefer-tag-over-role';

const count = (code: string): number =>
  new Linter({ configType: 'flat' })
    .verify(
      code,
      [
        {
          files: ['**/*.tsx'],
          languageOptions: {
            parser: tsParser as never,
            ecmaVersion: 2022,
            sourceType: 'module',
            parserOptions: { ecmaFeatures: { jsx: true } },
          },
          plugins: {
            a: {
              rules: { 'prefer-tag-over-role': preferTagOverRole as never },
            },
          },
          rules: { 'a/prefer-tag-over-role': 'error' },
        },
      ],
      'subject.tsx',
    )
    .filter((m) => m.ruleId === 'a/prefer-tag-over-role').length;

describe('still reports — the rule keeps its job', () => {
  it('a div with role=img', () => {
    expect(count('const a = <div role="img" aria-label="x" />;')).toBe(1);
  });

  it('a span with role=link', () => {
    expect(count('const a = <span role="link">t</span>;')).toBe(1);
  });

  it('an svg with a role that is NOT img', () => {
    // The exemption below is specific to role="img", not blanket for <svg>.
    expect(count('const a = <svg role="link"><path /></svg>;')).toBe(1);
  });
});

describe('svg with role=img is the recommended pattern, not a violation', () => {
  it('does not report', () => {
    // An inline SVG needs role="img" plus an accessible name to be announced
    // as one graphic. It cannot become <img> without moving to an external
    // file and losing currentColor, styling and animation.
    expect(
      count('const a = <svg role="img" aria-label="x"><path /></svg>;'),
    ).toBe(0);
  });
});

describe('a custom component is not a DOM element', () => {
  it('does not report on a capitalised component', () => {
    expect(count('const a = <Box role="img" aria-label="x" />;')).toBe(0);
  });

  it('does not report on a component whose name merely looks like a tag', () => {
    // Deciding from the name is the failure this avoids: `MuiLink` renders an
    // <a> already, and nothing here can see that.
    expect(count('const a = <MuiLink role="link" href="/x">t</MuiLink>;')).toBe(
      0,
    );
  });

  it('does not report on a member-expression component', () => {
    expect(count('const a = <Foo.Bar role="img" aria-label="x" />;')).toBe(0);
  });
});
