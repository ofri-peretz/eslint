/**
 * The package used as an npm alias for eslint-plugin-react:
 *
 *   "eslint-plugin-react": "npm:eslint-plugin-react-features@x"
 *
 * Next.js, Expo and most shared configs then register the plugin as `react` and
 * take the preset from `react.configs.flat.recommended` or spread
 * `react.configs['jsx-runtime'].rules`. Rule ids must come out as `react/<rule>`,
 * not `react-features/<rule>`. These tests load the preset the way a consumer does
 * and run ESLint on a JSX file, so a wrong key fails at config load.
 */
import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import plugin, { configs } from '../index';

// What a consumer gets from `import react from 'eslint-plugin-react'`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const react = plugin as unknown as { configs: any };

const SOURCE = `
export const List = ({ items }) => (
  <ul>
    {items.map((item) => <li>{item}</li>)}
  </ul>
);
`;

async function lint(overrideConfig: any[]) {
  const eslint = new ESLint({ overrideConfigFile: true, overrideConfig });
  const [result] = await eslint.lintText(SOURCE, { filePath: 'list.jsx' });
  return result.messages;
}

const ids = (messages: { ruleId: string | null }[]) =>
  messages.map((m) => m.ruleId);

describe('alias as eslint-plugin-react', () => {
  it('flat.recommended runs on a JSX file and reports under react/*', async () => {
    const messages = await lint([
      { files: ['**/*.jsx'] },
      react.configs.flat.recommended,
    ]);
    expect(messages.filter((m) => m.fatal)).toEqual([]);
    expect(ids(messages)).toContain('react/jsx-key');
    expect(ids(messages)).toContain('react/react-in-jsx-scope');
    expect(ids(messages).every((id) => !id || id.startsWith('react/'))).toBe(
      true,
    );
  });

  it('flat["jsx-runtime"] after flat.recommended turns off the React-in-scope rules', async () => {
    const messages = await lint([
      { files: ['**/*.jsx'] },
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
    ]);
    expect(ids(messages)).toContain('react/jsx-key');
    expect(ids(messages)).not.toContain('react/react-in-jsx-scope');
  });

  it('a spread of .rules into a config that registers the plugin as `react` loads (Next/Expo shape)', async () => {
    const messages = await lint([
      {
        files: ['**/*.jsx'],
        plugins: { react: plugin },
        languageOptions: {
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        rules: {
          ...react.configs.flat.recommended.rules,
          ...react.configs['jsx-runtime'].rules,
          'react/prop-types': 'off',
        },
      },
    ]);
    expect(messages.filter((m) => m.fatal)).toEqual([]);
    expect(ids(messages)).toContain('react/jsx-key');
    expect(ids(messages)).not.toContain('react/react-in-jsx-scope');
  });

  it('the plugin object carries its own configs, as eslint-plugin-react does', () => {
    expect(react.configs).toBe(configs);
    expect(Object.keys(react.configs.flat).sort()).toEqual([
      'all',
      'jsx-runtime',
      'recommended',
    ]);
  });
});
