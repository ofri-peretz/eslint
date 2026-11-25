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
import { describe, it, expect, vi, afterEach } from 'vitest';
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

/**
 * `configs.recommended` is the one preset whose name both packages use. Installed
 * as `eslint-plugin-react` it must be eslint-plugin-react's: legacy-shaped, with
 * `react/<rule>` ids, because that is what `plugin:react/recommended` through
 * `FlatCompat` and a spread of `react.configs.recommended.rules` read. Under its own
 * name the package keeps its `react-features/` preset.
 *
 * The install location is `node_modules/eslint-plugin-react/` for an alias, so the
 * tests load the module twice, once as each.
 */
describe('configs.recommended by install name', () => {
  afterEach(() => {
    vi.doUnmock('../utils/alias-install');
    vi.resetModules();
  });

  async function load(asReact: boolean) {
    vi.resetModules();
    vi.doMock('../utils/alias-install', () => ({
      isInstalledAsReact: () => asReact,
    }));
    const mod = await import('../index');
    return mod.default as unknown as { configs: any };
  }

  it('under its own name the preset is react-features/ keyed, as before', async () => {
    const own = await load(false);
    expect(own.configs.recommended.plugins['react-features']).toBeDefined();
    expect(Object.keys(own.configs.recommended.rules)).toContain(
      'react-features/jsx-key',
    );
  });

  it('as an alias, a spread of recommended.rules is upstream-shaped (Mirador shape)', async () => {
    const aliased = await load(true);
    const keys = Object.keys(aliased.configs.recommended.rules);
    expect(keys.length).toBe(22);
    expect(keys.every((key) => key.startsWith('react/'))).toBe(true);

    const messages = await lint([
      {
        files: ['**/*.jsx'],
        plugins: { react: aliased as unknown as typeof plugin },
        languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
        rules: {
          ...aliased.configs.recommended.rules,
          'react/prop-types': 'off',
        },
      },
    ]);
    expect(messages.filter((m) => m.fatal)).toEqual([]);
    expect(ids(messages)).toContain('react/jsx-key');
  });

  it('as an alias, recommended is legacy-shaped: `plugins` is a name list and `parserOptions` is top level', async () => {
    const aliased = await load(true);
    const preset = aliased.configs.recommended;
    expect(preset.plugins).toEqual(['react']);
    expect(preset.parserOptions).toEqual({ ecmaFeatures: { jsx: true } });
    // the same 22 ids as flat.recommended, and the same object eslintrc-style loaders read
    expect(preset.rules).toBe(aliased.configs.flat.recommended.rules);
    expect(preset).toBe(aliased.configs['react-recommended']);
  });

  it('as an alias, plugin:react/recommended through a legacy loader runs on a JSX file', async () => {
    const aliased = await load(true);
    // What FlatCompat does with `extends: 'plugin:react/recommended'`: the named
    // plugin becomes a flat plugin and the block's rules and parserOptions carry over.
    const legacy = aliased.configs.recommended;
    const [name] = legacy.plugins as string[];
    const messages = await lint([
      {
        files: ['**/*.jsx'],
        plugins: { [name]: aliased as unknown as typeof plugin },
        languageOptions: { parserOptions: legacy.parserOptions },
        rules: { ...legacy.rules, 'react/prop-types': 'off' },
      },
    ]);
    expect(messages.filter((m) => m.fatal)).toEqual([]);
    expect(ids(messages)).toContain('react/jsx-key');
    expect(ids(messages).every((id) => !id || id.startsWith('react/'))).toBe(
      true,
    );
  });

  it('both presets stay reachable by name in either install', async () => {
    for (const asReact of [false, true]) {
      const loaded = await load(asReact);
      expect(loaded.configs['react-recommended'].plugins).toEqual(['react']);
      expect(
        Object.keys(loaded.configs['react-features-recommended'].rules).every(
          (key) => key.startsWith('react-features/'),
        ),
      ).toBe(true);
    }
  });

  it('the non-enumerable presets stay out of `Object.keys(configs)`', async () => {
    const loaded = await load(true);
    expect(Object.keys(loaded.configs).sort()).toEqual([
      'componentApi',
      'flagship',
      'recommended',
    ]);
  });
});

describe('the three rules added for the react-app set', () => {
  const NEW = [
    'style-prop-object',
    'jsx-pascal-case',
    'forbid-foreign-prop-types',
  ];

  it('are in flat.all under react/*, and not in recommended (upstream has them off)', () => {
    for (const name of NEW) {
      expect(react.configs.flat.all.rules[`react/${name}`]).toBe(2);
      expect(
        react.configs.flat.recommended.rules[`react/${name}`],
      ).toBeUndefined();
    }
  });

  it("report through the `react` alias with upstream's option shapes", async () => {
    const messages = await new ESLint({
      overrideConfigFile: true,
      overrideConfig: [
        {
          files: ['**/*.jsx'],
          plugins: { react: plugin },
          languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
          rules: {
            'react/style-prop-object': ['error', { allow: ['Hello'] }],
            'react/jsx-pascal-case': [
              'error',
              { allowAllCaps: true, ignore: [] },
            ],
            'react/forbid-foreign-prop-types': [
              'error',
              { allowInPropTypes: true },
            ],
          },
        },
      ],
    })
      .lintText(
        `<div style="color: red" />; <Hello style="x" />; <snake_case_tag />; <My_comp />; const a = Foo.propTypes;`,
        { filePath: 'a.jsx' },
      )
      .then(([result]) => result.messages);
    expect(messages.filter((m) => m.fatal)).toEqual([]);
    expect(ids(messages).sort()).toEqual([
      'react/forbid-foreign-prop-types',
      'react/jsx-pascal-case',
      'react/style-prop-object',
    ]);
  });
});
