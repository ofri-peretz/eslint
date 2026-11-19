/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `flatConfigs` is eslint-plugin-import's, key for key.
 *
 * Shared configs read `importPlugin.flatConfigs.errors`, `.recommended` and
 * `.typescript`. Before this export existed, aliasing eslint-plugin-import to
 * this package made those reads `undefined` and the config failed to load. This file locks three
 * things against the installed eslint-plugin-import@2.32.0, not against a copy:
 *
 *   1. the same keys, and per key the same name, rules, severities, settings
 *      and languageOptions;
 *   2. every config loads in a real `ESLint` instance and lints a fixture with
 *      the same findings (rule, line, severity) as upstream's. Columns are left
 *      out on purpose: `no-duplicates` reports at the declaration here and at
 *      the source string upstream, a per-rule location difference that says
 *      nothing about whether the CONFIG is the same;
 *   3. a config written for eslint-plugin-import works when only its import
 *      line changes, and registering the plugin a second time next to a flat
 *      config does not throw "Cannot redefine plugin".
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ESLint, type Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import importNext, {
  configs as ownConfigs,
  flatConfigs as ownFlatConfigs,
  meta,
  plugin,
  rules,
} from './index';

const require_ = createRequire(__filename);

// The plugin types its configs with typescript-eslint's `FlatConfig.Config`;
// ESLint's `Linter.Config` is the same shape under a stricter index signature.
const flatConfigs = ownFlatConfigs as unknown as Record<
  keyof typeof ownFlatConfigs,
  Linter.Config
>;

const KEYS = [
  'recommended',
  'errors',
  'warnings',
  'react',
  'react-native',
  'electron',
  'typescript',
] as const;
type Key = (typeof KEYS)[number];

interface UpstreamPlugin {
  flatConfigs: Record<Key, Linter.Config>;
}
const upstream = require_('eslint-plugin-import') as UpstreamPlugin;
const upstreamVersion = (
  require_('eslint-plugin-import/package.json') as { version: string }
).version;

/** Everything but `plugins`, which necessarily differs (it is the plugin). */
const contentOf = (config: Linter.Config) => {
  const { plugins: _plugins, ...rest } = config;
  return JSON.parse(JSON.stringify(rest)) as unknown;
};

// ── Fixture ────────────────────────────────────────────────────────────────
//
// One file per behaviour the configs switch on. Real files on disk, because
// `no-unresolved`, `named` and `default` resolve and parse what is imported.
let dir: string;

const FILES: Record<string, string> = {
  'a.js': 'export const x = 1;\n',
  'b.ts': 'export const z: number = 1;\n',
  'comp.ios.js': 'export default 1;\n',
  'main.js': [
    "import { y } from './a';", // named: y is not exported
    "import d from './a';", // default: a has no default export
    "import './nope';", // no-unresolved
    "import { x } from './a';", // no-duplicates (with the two above)
    "import * as ns from './a';",
    'ns.missing;', // namespace
    'export { x, y, d };',
    '',
  ].join('\n'),
  'ts-consumer.js': [
    "import bd from './b';", // default, through `import/parsers` + `.ts` resolution
    "import { nope } from './b';", // named: off in `typescript`
    'export { bd, nope };',
    '',
  ].join('\n'),
  'native.js': "import c from './comp';\nexport { c };\n", // react-native extensions
  'electron.js': "import { app } from 'electron';\nexport { app };\n", // core-modules
  'jsx.js': 'export const el = <div />;\n', // react: JSX parsing
};

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'import-next-flat-'));
  for (const [name, text] of Object.entries(FILES)) {
    writeFileSync(join(dir, name), text);
  }
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

interface Finding {
  ruleId: string | null;
  line: number;
  severity: number;
  fatal: boolean;
}

/** Order-free comparison key: rule, line, severity. */
const keyed = (findings: Finding[]) =>
  findings.map((f) => `${f.ruleId}@${f.line}:${f.severity}`).sort();

async function lint(config: Linter.Config[], file: string): Promise<Finding[]> {
  const eslint = new ESLint({
    cwd: dir,
    overrideConfigFile: true,
    overrideConfig: config,
  });
  const [result] = await eslint.lintFiles([join(dir, file)]);
  return result.messages.map((m) => ({
    ruleId: m.ruleId,
    line: m.line,
    severity: m.severity,
    fatal: m.fatal === true,
  }));
}

/** Each config, and the fixture file it changes the outcome of. */
const CASES: Record<Key, { file: string; extra?: Key[] }> = {
  recommended: { file: 'main.js' },
  errors: { file: 'main.js' },
  warnings: { file: 'main.js' },
  // react/react-native/electron carry settings only, so pair them with a
  // rule-bearing config the way consumers do.
  react: { file: 'jsx.js', extra: ['errors'] },
  'react-native': { file: 'native.js', extra: ['errors'] },
  electron: { file: 'electron.js', extra: ['errors'] },
  typescript: { file: 'ts-consumer.js', extra: ['recommended'] },
};

const build = (
  plugin: { flatConfigs: Record<string, Linter.Config> },
  key: Key,
) => [
  ...(CASES[key].extra ?? []).map((k) => plugin.flatConfigs[k]),
  plugin.flatConfigs[key],
];

describe(`flatConfigs — same as eslint-plugin-import@${upstreamVersion}`, () => {
  it('has exactly the keys upstream has', () => {
    expect(Object.keys(flatConfigs).sort()).toEqual(
      Object.keys(upstream.flatConfigs).sort(),
    );
    expect(Object.keys(flatConfigs).sort()).toEqual([...KEYS].sort());
  });

  it.each(KEYS)(
    '%s: same name, rules, severities, settings, languageOptions',
    (key) => {
      expect(contentOf(flatConfigs[key])).toEqual(
        contentOf(upstream.flatConfigs[key]),
      );
    },
  );

  it.each(KEYS)(
    '%s: registers this plugin, and only it, as `import`',
    (key) => {
      expect(Object.keys(flatConfigs[key].plugins ?? {})).toEqual(['import']);
      expect(flatConfigs[key].plugins?.['import']).toBe(importNext);
    },
  );

  it.each(KEYS)('%s: every rule it names exists here', (key) => {
    for (const id of Object.keys(flatConfigs[key].rules ?? {})) {
      expect(id.startsWith('import/')).toBe(true);
      expect(rules).toHaveProperty(id.slice('import/'.length));
    }
  });

  it.each(KEYS)(
    '%s: loads in ESLint and finds what upstream finds on the fixture',
    async (key) => {
      const ours = await lint(
        build(importNext as unknown as UpstreamPlugin, key),
        CASES[key].file,
      );
      const theirs = await lint(build(upstream, key), CASES[key].file);
      expect(ours.filter((f) => f.fatal)).toEqual([]);
      expect(keyed(ours)).toEqual(keyed(theirs));
    },
  );

  it('the fixture exercises the configs (no vacuous equality)', async () => {
    const ids = (await lint([flatConfigs.recommended], 'main.js')).map(
      (f) => f.ruleId,
    );
    expect(ids).toEqual(
      expect.arrayContaining([
        'import/named',
        'import/default',
        'import/no-unresolved',
        'import/namespace',
        'import/no-duplicates',
      ]),
    );
    // Without `react`, the JSX fixture is a parse error; with it, it is not.
    expect(
      (await lint([flatConfigs.errors], 'jsx.js')).some((f) => f.fatal),
    ).toBe(true);
    // Without `electron`/`react-native`, those imports are unresolved.
    expect(
      (await lint([flatConfigs.errors], 'electron.js')).map((f) => f.ruleId),
    ).toEqual(['import/no-unresolved']);
    expect(
      (await lint([flatConfigs.errors], 'native.js')).map((f) => f.ruleId),
    ).toEqual(['import/no-unresolved']);
    // `typescript` turns `named` off and resolves + parses `.ts` for `default`.
    expect(
      keyed(
        await lint(
          [flatConfigs.recommended, flatConfigs.typescript],
          'ts-consumer.js',
        ),
      ),
    ).toEqual([
      'import/default@1:2',
      'import/no-duplicates@1:1',
      'import/no-duplicates@2:1',
    ]);
  });
});

describe('a config written for eslint-plugin-import, with only the import swapped', () => {
  // A typical shared config's body: it reads only the default import.
  //   import importPlugin from 'eslint-plugin-import';   // before
  //   import importPlugin from 'eslint-plugin-import-next'; // after
  const configBody = (importPlugin: UpstreamPlugin): Linter.Config[] => [
    importPlugin.flatConfigs.recommended,
    importPlugin.flatConfigs.typescript,
    { files: ['**/*.ts'], languageOptions: { parser: tsParser } },
  ];

  it.each(['main.js', 'ts-consumer.js', 'b.ts'])(
    '%s: same findings as with eslint-plugin-import',
    async (file) => {
      const ours = await lint(
        configBody(importNext as unknown as UpstreamPlugin),
        file,
      );
      const theirs = await lint(configBody(upstream), file);
      expect(ours.filter((f) => f.fatal)).toEqual([]);
      expect(keyed(ours)).toEqual(keyed(theirs));
    },
  );
});

describe('registering the plugin next to a flat config', () => {
  it('`plugins: { import: importNext }` plus `importNext.flatConfigs.errors` loads', async () => {
    const findings = await lint(
      [{ plugins: { import: importNext as never } }, flatConfigs.errors],
      'main.js',
    );
    expect(findings.map((f) => f.ruleId)).toContain('import/no-unresolved');
  });

  it('`plugins: { "import-next": importNext }` next to an existing preset loads', async () => {
    const preset = ownConfigs.recommended as unknown as Linter.Config;
    const findings = await lint(
      [preset, { plugins: { 'import-next': importNext as never } }],
      'main.js',
    );
    expect(findings.filter((f) => f.fatal)).toEqual([]);
    expect(findings.map((f) => f.ruleId)).toContain(
      'import-next/no-unresolved',
    );
  });

  it('`plugin`, the default export and every preset share one object', () => {
    expect(plugin).toBe(importNext);
    for (const preset of Object.values(ownConfigs)) {
      expect(preset.plugins?.['import-next']).toBe(importNext);
    }
  });

  it('the default export is the module: one object for every loader', () => {
    expect(importNext.flatConfigs).toBe(ownFlatConfigs);
    expect(importNext.meta).toBe(meta);
    expect(importNext.rules).toBe(rules);
    expect(importNext.default).toBe(importNext);
    expect(meta.name).toBe('eslint-plugin-import-next');
  });
});
