/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `no-unknown-property` and the two things it mistook for DOM elements.
 *
 * A census of all 65 findings on the pinned corpus found 65 false positives in
 * two classes:
 *
 *   - every attribute of a CUSTOM ELEMENT (`<altcha-widget floating … />`).
 *     The rule already skipped custom components by their capital letter, but
 *     a web component is lowercase, so it looked like a host element. React
 *     passes attributes to custom elements through verbatim.
 *   - `xmlns` and `xmlnsXlink` on `<svg>`, which React accepts and which every
 *     icon exporter emits.
 *
 * The report cases come first, because this rule has a real job — `class`
 * instead of `className` is a genuine React bug — and neither guard may cost
 * it.
 */

import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { noUnknownProperty } from './no-unknown-property';

const messages = (code: string) =>
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
          plugins: { r: { rules: { 'no-unknown-property': noUnknownProperty as never } } },
          rules: { 'r/no-unknown-property': 'error' },
        },
      ],
      'subject.tsx',
    )
    .filter((m) => m.ruleId === 'r/no-unknown-property');

const count = (code: string): number => messages(code).length;

describe('still reports — the rule keeps its job', () => {
  it('class instead of className', () => {
    expect(count('const a = <div class="x" />;')).toBe(1);
  });

  it('an attribute that is not a DOM property', () => {
    expect(count('const a = <div flooble="x" />;')).toBe(1);
  });

  it('a bogus attribute on a lowercase tag WITHOUT a hyphen', () => {
    // Guards against the custom-element exemption widening to every tag.
    expect(count('const a = <span flooble="x" />;')).toBe(1);
  });
});

describe('custom elements define their own attributes', () => {
  it('does not report on a hyphenated tag', () => {
    expect(count('const a = <altcha-widget floating challengeurl="/x" onverified={f} />;')).toBe(0);
  });

  it('does not report on any custom element', () => {
    expect(count('const a = <my-thing whatever="1" another="2" />;')).toBe(0);
  });
});

describe('React accepts the XML namespace attributes', () => {
  it('does not report xmlns or xmlnsXlink on svg', () => {
    expect(count('const a = <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="x" />;')).toBe(0);
  });

  it('does not report the ordinary svg attributes beside them', () => {
    expect(
      count('const a = <svg width="1" height="2" viewBox="0 0 1 2" fill="none" xmlns="x" />;'),
    ).toBe(0);
  });
});

describe('the message names the property', () => {
  it('says which attribute and which element', () => {
    // It read "Unknown DOM property detected", which told the reader nothing
    // about where to look.
    const [m] = messages('const a = <div flooble="x" />;');
    expect(m.message).toContain('flooble');
    expect(m.message).toContain('div');
  });
});
