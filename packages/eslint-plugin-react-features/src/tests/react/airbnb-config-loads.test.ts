/**
 * End to end: eslint-config-airbnb 19.0.4's entries for the six rules, loaded
 * into an ESLint 10 flat-config Linter with this plugin registered as `react`.
 * Config validation runs when the Linter first uses the config, so a schema
 * that rejects airbnb's options throws here, as it did for every airbnb user.
 */
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import plugin from '../../index';
import { AIRBNB_OPTIONS } from './airbnb-react-options';

const code = `class C extends React.Component {
  render() { return <div onClick={() => 1} />; }
}`;

describe('eslint-config-airbnb react rules load', () => {
  for (const [rule, options] of Object.entries(AIRBNB_OPTIONS)) {
    it(`react/${rule} accepts airbnb's options`, () => {
      const linter = new Linter();
      expect(() =>
        linter.verify(
          code,
          [
            {
              files: ['**/*.jsx'],
              plugins: { react: plugin as never },
              languageOptions: {
                parserOptions: { ecmaFeatures: { jsx: true } },
              },
              rules: { [`react/${rule}`]: ['error', ...options] },
            },
          ],
          { filename: 'a.jsx' },
        ),
      ).not.toThrow();
    });
  }

  it('all six together lint a file with no config or fatal message', () => {
    const linter = new Linter();
    const rules = Object.fromEntries(
      Object.entries(AIRBNB_OPTIONS).map(([rule, options]) => [
        `react/${rule}`,
        ['error', ...options],
      ]),
    );
    const messages = linter.verify(
      code,
      [
        {
          files: ['**/*.jsx'],
          plugins: { react: plugin as never },
          languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
          rules: rules as never,
        },
      ],
      { filename: 'a.jsx' },
    );
    expect(messages.filter((m) => m.fatal)).toEqual([]);
  });
});
