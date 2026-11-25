/**
 * Tests for jsx-uses-react
 * Marks the JSX factory used, so `no-unused-vars` leaves `React` alone. The
 * case list follows eslint-plugin-react's tests/lib/rules/jsx-uses-react.js
 * (the full set is in upstream-parity/). The rule never reports; its effect is
 * on the core rule beside it, so the tests lint with both.
 */
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import { jsxUsesReact } from '../../rules/react/jsx-uses-react';

/** The names `no-unused-vars` reports as unused. */
function unused(code: string, settings?: Record<string, unknown>): string[] {
  return new Linter({ configType: 'flat' })
    .verify(code, {
      files: ['**/*.js'],
      plugins: {
        react: { rules: { 'jsx-uses-react': jsxUsesReact } as never },
      },
      languageOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      ...(settings ? { settings } : {}),
      rules: { 'react/jsx-uses-react': 'error', 'no-unused-vars': 'error' },
    })
    .map((m) => /'(\w+)'/.exec(m.message)?.[1] ?? m.message);
}

describe('jsx-uses-react', () => {
  it('leaves React unused-free when it renders an element', () => {
    expect(unused('var React; <div />;')).toEqual([]);
  });

  it('leaves React unused-free when it renders a fragment', () => {
    expect(unused('var React; <></>;')).toEqual([]);
  });

  it('does not hide a React that no JSX uses', () => {
    expect(unused('var React;')).toEqual(['React']);
  });

  it('does not hide another unused variable', () => {
    expect(unused('var React, Other; <div />;')).toEqual(['Other']);
  });

  it('follows a @jsx pragma comment', () => {
    expect(unused('/** @jsx Foo */ var Foo; <div />;')).toEqual([]);
  });

  it('follows a dotted @jsx pragma to its first name', () => {
    expect(unused('/** @jsx Foo.createElement */ var Foo; <div />;')).toEqual(
      [],
    );
  });

  it('follows settings.react.pragma', () => {
    expect(unused('var Foo; <div />;', { react: { pragma: 'Foo' } })).toEqual(
      [],
    );
  });

  it('marks the settings.react.fragment binding for a fragment', () => {
    expect(
      unused('var React, Frag; <></>;', { react: { fragment: 'Frag' } }),
    ).toEqual([]);
  });

  it('ignores a pragma that is not an identifier', () => {
    expect(
      unused('var React; <div />;', { react: { pragma: 'not valid' } }),
    ).toEqual([]);
  });
});
