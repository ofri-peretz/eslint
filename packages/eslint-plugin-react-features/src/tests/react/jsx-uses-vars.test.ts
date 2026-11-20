/**
 * Tests for jsx-uses-vars
 * Marks variables used as JSX tags as used, so `no-unused-vars` leaves them
 * alone. The case list follows eslint-plugin-react's
 * tests/lib/rules/jsx-uses-vars.js (the full set is in upstream-parity/). The
 * rule never reports; its effect is on the core rule beside it, so the tests
 * lint with both.
 */
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import { jsxUsesVars } from '../../rules/react/jsx-uses-vars';

/** The names `no-unused-vars` reports as unused. */
function unused(code: string): string[] {
  return new Linter({ configType: 'flat' })
    .verify(code, {
      files: ['**/*.js'],
      plugins: { react: { rules: { 'jsx-uses-vars': jsxUsesVars } as never } },
      languageOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      rules: { 'react/jsx-uses-vars': 'error', 'no-unused-vars': 'error' },
    })
    .map((m) => /'(\w+)'/.exec(m.message)?.[1] ?? m.message);
}

describe('jsx-uses-vars', () => {
  it('counts a component used as a tag', () => {
    expect(unused('var App; <App />;')).toEqual([]);
  });

  it('counts the leftmost object of a member tag', () => {
    expect(unused('var Foo; <Foo.Bar.Baz />;')).toEqual([]);
  });

  it('does not count an intrinsic element as a use of a variable', () => {
    expect(unused('var div; <div />;')).toEqual(['div']);
  });

  it('does not count a namespaced tag', () => {
    expect(unused('var ns; <ns:tag />;')).toEqual(['ns']);
  });

  it('does not count `this` as a variable', () => {
    expect(
      unused('export class A { render() { return <this.Foo />; } }'),
    ).toEqual([]);
  });

  it('does not hide a variable no tag uses', () => {
    expect(unused('var App, Other; <App />;')).toEqual(['Other']);
  });
});
