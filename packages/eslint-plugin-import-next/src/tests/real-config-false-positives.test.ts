/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Two false-positive classes measured on a real, lint-clean monorepo config
 * (svelte, docusaurus, tsconfig `paths`, `eslint-import-resolver-custom-alias`)
 * where eslint-plugin-import 2.32.0 reports nothing.
 *
 * no-duplicates: `svelte` and `svelte/store` are two modules. Their `exports`
 * send both to one `types` file, and keying duplicates by the file the
 * `types` condition lands on made every `import { onMount } from 'svelte'`
 * beside `import { get } from 'svelte/store'` a duplicate (58 findings).
 *
 * no-extraneous-dependencies: a specifier that resolves to the project's own
 * file, or that resolves to nothing at all (docusaurus' `@theme/*`,
 * `@docusaurus/*` and `@site/*` virtual modules), is not a package to declare.
 * eslint-plugin-import checks a dependency only once it resolves (71 findings).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, expect, it, afterAll } from 'vitest';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { noDuplicates } from '../rules/no-duplicates';
import { noExtraneousDependencies } from '../rules/no-extraneous-dependencies';

const dir = fs.realpathSync(
  fs.mkdtempSync(path.join(os.tmpdir(), 'real-config-fp-')),
);
const write = (name: string, text: string) => {
  fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
  fs.writeFileSync(path.join(dir, name), text);
};
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

// The repro's package: two subpaths, one shared `types` file, two runtime
// files (svelte 5 maps `.`, `./store` and `./motion` the same way).
write(
  'app/package.json',
  JSON.stringify({ name: 'app', dependencies: { sharedtypes: '1' } }),
);
write(
  'app/node_modules/sharedtypes/package.json',
  JSON.stringify({
    name: 'sharedtypes',
    exports: {
      '.': { types: './types/index.d.ts', default: './src/index.js' },
      './store': { types: './types/index.d.ts', default: './src/store.js' },
    },
  }),
);
write(
  'app/node_modules/sharedtypes/types/index.d.ts',
  'export declare const a: 1;\nexport declare const b: 2;\n',
);
write('app/node_modules/sharedtypes/src/index.js', 'export const a = 1;\n');
write('app/node_modules/sharedtypes/src/store.js', 'export const b = 2;\n');
write('app/src/main.ts', '');

// The tsconfig `paths` repro, a custom-alias folder, and an installed
// package nobody declared.
write(
  'site/package.json',
  JSON.stringify({ name: 'site', devDependencies: {} }),
);
write(
  'site/tsconfig.json',
  JSON.stringify({
    compilerOptions: { baseUrl: '.', paths: { '@app/*': ['src/lib/*'] } },
  }),
);
write('site/src/lib/util.ts', 'export const z = 1;\n');
write('site/src/aliased/thing.ts', 'export const t = 1;\n');
write('site/node_modules/undeclared/package.json', '{"name":"undeclared"}');
write('site/node_modules/undeclared/index.js', 'module.exports = 1;\n');
write('site/src/main.ts', '');

const inApp = path.join(dir, 'app/src/main.ts');
const inSite = path.join(dir, 'site/src/main.ts');

/** The resolver settings of the measured config, in its effective order. */
const MEASURED_SETTINGS: Record<string, unknown> = {
  'import/resolver': {
    node: true,
    typescript: true,
    'eslint-import-resolver-custom-alias': {
      // Absolute: the resolver reads a relative folder from the working
      // directory, which is this package's, not the fixture's.
      alias: { '@aliased': path.join(dir, 'site/src/aliased') },
      extensions: ['.ts'],
    },
  },
};

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-duplicates — subpaths that share a `types` file', () => {
  ruleTester.run('no-duplicates', noDuplicates, {
    valid: [
      {
        name: 'two subpath exports, one types file: no resolver settings',
        filename: inApp,
        code: "import { a } from 'sharedtypes';\nimport { b } from 'sharedtypes/store';",
      },
      {
        name: 'two subpath exports, one types file: node then typescript',
        filename: inApp,
        code: "import { a } from 'sharedtypes';\nimport { b } from 'sharedtypes/store';",
        settings: MEASURED_SETTINGS,
      },
      {
        name: 'two subpath exports, one types file: typescript only',
        filename: inApp,
        code: "import { a } from 'sharedtypes';\nimport { b } from 'sharedtypes/store';",
        settings: { 'import/resolver': { typescript: true } },
      },
    ],
    invalid: [
      {
        name: 'the same subpath twice is still a duplicate',
        filename: inApp,
        code: "import { a } from 'sharedtypes/store';\nimport { b } from 'sharedtypes/store';",
        settings: MEASURED_SETTINGS,
        output: "import { a, b } from 'sharedtypes/store';\n",
        errors: [{ messageId: 'noDuplicates' }, { messageId: 'noDuplicates' }],
      },
      {
        name: 'a custom-alias specifier and a relative one name one file',
        filename: inSite,
        code: "import { t } from '@aliased/thing';\nimport { t as u } from './aliased/thing';",
        settings: MEASURED_SETTINGS,
        output: "import { t, t as u } from '@aliased/thing';\n",
        errors: [{ messageId: 'noDuplicates' }, { messageId: 'noDuplicates' }],
      },
    ],
  });
});

describe('no-extraneous-dependencies — aliases and virtual modules are not packages', () => {
  ruleTester.run('no-extraneous-dependencies', noExtraneousDependencies, {
    valid: [
      {
        name: 'a tsconfig `paths` alias into the project',
        filename: inSite,
        code: "import { z } from '@app/util';",
        settings: MEASURED_SETTINGS,
      },
      {
        name: 'a custom-alias mapping into the project',
        filename: inSite,
        code: "import { t } from '@aliased/thing';",
        settings: MEASURED_SETTINGS,
      },
      {
        name: 'docusaurus virtual modules resolve to nothing on disk',
        filename: inSite,
        code: [
          "import Layout from '@theme/Layout';",
          "import Link from '@docusaurus/Link';",
          "import Card from '@site/src/components/Card';",
        ].join('\n'),
        settings: MEASURED_SETTINGS,
      },
    ],
    invalid: [
      {
        // A resolver this plugin does not model may map what ours cannot
        // (eslint-plugin-import's own case: `alias/chai` through webpack's
        // `resolve.alias`), so "none of ours resolves it" is not "nothing".
        name: 'under a resolver it does not model, an unresolved specifier is still checked',
        filename: inSite,
        code: "import c from 'alias/chai';",
        settings: { 'import/resolver': 'webpack' },
        errors: [
          {
            messageId: 'missingDependency',
            suggestions: [
              {
                messageId: 'addToDependencies',
                output:
                  "// TODO: Run: npm install alias\nimport c from 'alias/chai';",
              },
              {
                messageId: 'addToDevDependencies',
                output:
                  "// TODO: Run: npm install --save-dev alias\nimport c from 'alias/chai';",
              },
            ],
          },
        ],
      },
      {
        name: 'an installed package that is not declared is still reported',
        filename: inSite,
        code: "import u from 'undeclared';",
        settings: MEASURED_SETTINGS,
        errors: [
          {
            messageId: 'missingDependency',
            suggestions: [
              {
                messageId: 'addToDependencies',
                output:
                  "// TODO: Run: npm install undeclared\nimport u from 'undeclared';",
              },
              {
                messageId: 'addToDevDependencies',
                output:
                  "// TODO: Run: npm install --save-dev undeclared\nimport u from 'undeclared';",
              },
            ],
          },
        ],
      },
    ],
  });
});

/**
 * eslint-plugin-import's messages are one line that names what to fix:
 * `'zod' should be listed in the project's dependencies.`. These were two
 * lines, an emoji and a severity word, and named neither the package nor the
 * file it belongs in.
 */
describe('messages name the package and the file, in one line', () => {
  const lint = (
    rule: 'no-duplicates' | 'no-extraneous-dependencies',
    code: string,
    filename: string,
  ) => {
    const linter = new Linter({ cwd: dir, configType: 'flat' });
    return linter.verify(
      code,
      [
        {
          files: ['**/*.ts'],
          languageOptions: { parser },
          plugins: {
            import: {
              rules: {
                'no-duplicates': noDuplicates,
                'no-extraneous-dependencies': noExtraneousDependencies,
              },
            } as never,
          },
          rules: { [`import/${rule}`]: 'error' },
        },
      ],
      filename,
    );
  };

  it('no-extraneous-dependencies names the package and its package.json', () => {
    const [message] = lint(
      'no-extraneous-dependencies',
      "import u from 'undeclared';",
      inSite,
    );
    expect(message?.message).toBe(
      "'undeclared' should be listed in the dependencies of site/package.json. Run 'npm i -S undeclared' to add it.",
    );
  });

  it('no-duplicates names the module and the file it resolves to', () => {
    const messages = lint(
      'no-duplicates',
      "import { a } from 'sharedtypes/store';\nimport { b } from 'sharedtypes/store';",
      inApp,
    );
    expect(messages.map((m) => m.message)).toEqual([
      "'sharedtypes/store' imported multiple times (app/node_modules/sharedtypes/src/store.js).",
      "'sharedtypes/store' imported multiple times (app/node_modules/sharedtypes/src/store.js).",
    ]);
  });

  it('no-duplicates names the module alone when it does not resolve', () => {
    const messages = lint(
      'no-duplicates',
      "import { a } from 'nowhere';\nimport { b } from 'nowhere';",
      inApp,
    );
    expect(messages.map((m) => m.message)).toEqual([
      "'nowhere' imported multiple times.",
      "'nowhere' imported multiple times.",
    ]);
  });
});
