/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Five classes where import-next disagreed with eslint-plugin-import 2.32.0 on real repos.
 *
 * Found by running both plugins with the same config over apollo-server and
 * lynx-stack (scout/import/2026-11-21-verifier.md). Each describe block is the
 * minimal repro from that write-up, and each case fails on the source it was
 * written against. A drop-in that reports where the incumbent is silent costs the
 * adopter a red build, so these are graded against upstream's behaviour, not ours.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import { describe, it, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import { fixupPluginRules } from '@eslint/compat';
import { extensions } from '../rules/extensions';
import { consistentTypeSpecifierStyle } from '../rules/consistent-type-specifier-style';
import { noUnresolved } from '../rules/no-unresolved';
import { noCommonjs } from '../rules/no-commonjs';
import { noCycle } from '../rules/no-cycle';

const dir = fs.realpathSync(
  fs.mkdtempSync(path.join(os.tmpdir(), 'import-next-dropin-')),
);
const write = (name: string, text = 'export const x = 1;\n') => {
  fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
  fs.writeFileSync(path.join(dir, name), text);
};
write('a.ts');
write('App.tsx');
write('data.d.ts', 'export declare const data: number;\n');
write('src/widget.tsx');
write('src/cjs-helper.ts');
write(
  'tsconfig.json',
  JSON.stringify({
    compilerOptions: { baseUrl: '.', paths: { '@/*': ['src/*'] } },
  }),
);
const filename = path.join(dir, 'b.ts');
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

// The apollo-server config: `typescript` flat config, no `import/resolver` of its own.
describe('1. extensions: judge the extension as written', () => {
  ruleTester.run('extensions', extensions, {
    valid: [
      {
        name: "`./a.js` naming a.ts is the ESM TypeScript spelling; upstream's node resolver does not map it, so it reads the written `.js`",
        filename,
        code: "import { a } from './a.js';",
        options: ['ignorePackages'],
      },
      {
        name: 'same under the explicit upstream shape',
        filename,
        code: "import { a } from './a.js';",
        options: ['always', { ignorePackages: true }],
      },
      {
        name: '`./data.js` naming data.d.ts is the written extension too',
        filename,
        code: "import { data } from './data.js';",
        options: ['always'],
      },
      {
        name: '`./App.jsx` naming App.tsx is not missing an extension either',
        filename,
        code: "import { App } from './App.jsx';",
        options: ['always'],
      },
    ],
    invalid: [
      {
        name: 'no extension written still reports, by the resolved extension',
        filename,
        code: "import { a } from './a';",
        options: ['ignorePackages'],
        errors: [{ messageId: 'missingExtension' }],
      },
    ],
  });
});

describe('2. consistent-type-specifier-style: no options means upstream default', () => {
  ruleTester.run(
    'consistent-type-specifier-style',
    consistentTypeSpecifierStyle,
    {
      valid: [
        {
          name: 'with no options a top-level `import type` is fine (upstream: prefer-top-level)',
          code: "import type { Signal } from 'node:fs';",
        },
      ],
      invalid: [
        {
          name: 'with no options an inline `type` specifier is the finding',
          code: "import { type Foo } from 'node:os';",
          errors: [{ messageId: 'preferTopLevel' }],
          output: "import type { Foo } from 'node:os';",
        },
      ],
    },
  );
});

describe('3. no-unresolved: TypeScript extension aliases and path aliases', () => {
  const settings = {
    'import/resolver': {
      typescript: { project: path.join(dir, 'tsconfig.json') },
    },
  };
  ruleTester.run('no-unresolved', noUnresolved, {
    valid: [
      {
        name: '`./App.jsx` resolves to App.tsx',
        filename,
        settings,
        code: "import { App } from './App.jsx';",
      },
      {
        name: '`./data.js` resolves to data.d.ts',
        filename,
        settings,
        code: "import { data } from './data.js';",
      },
      {
        name: '`@/widget.js` resolves through tsconfig paths to widget.tsx',
        filename,
        settings,
        code: "import { x } from '@/widget.js';",
      },
      {
        name: '`@/widget.jsx` resolves through tsconfig paths to widget.tsx',
        filename,
        settings,
        code: "import { x } from '@/widget.jsx';",
      },
    ],
    invalid: [
      {
        name: 'a specifier that names nothing is still reported',
        filename,
        settings,
        code: "import { x } from './nothing.jsx';",
        errors: [
          {
            messageId: 'moduleNotFound',
            suggestions: [
              {
                messageId: 'addIgnoreComment',
                output:
                  "// eslint-disable-next-line import-next/no-unresolved\nimport { x } from './nothing.jsx';",
              },
            ],
          },
        ],
      },
    ],
  });
});

describe('4. no-commonjs: __dirname and __filename are not module syntax', () => {
  ruleTester.run('no-commonjs', noCommonjs, {
    valid: [
      {
        name: '__dirname in an ES module',
        filename,
        code: "import { join } from 'node:path';\nexport const d = join(__dirname, 'x');",
      },
      {
        name: '__filename in an ES module',
        filename,
        code: 'export const f = __filename;',
      },
    ],
    invalid: [
      {
        name: 'require() is still reported',
        filename,
        code: "const fs = require('fs'); console.log(__dirname);",
        errors: [
          {
            messageId: 'commonjsRequire',
            suggestions: [
              {
                messageId: 'commonjsRequire',
                output:
                  "const fs = // Convert to: import * as moduleName from 'fs';\nrequire('fs'); console.log(__dirname);",
              },
            ],
          },
        ],
      },
    ],
  });
});

describe('5. no-cycle: a type-only edge is not a cycle', () => {
  const lint = (aSource: string, bSource: string): number => {
    const sub = fs.mkdtempSync(path.join(dir, 'cycle-'));
    fs.writeFileSync(path.join(sub, 'b.ts'), bSource);
    const aPath = path.join(sub, 'a.ts');
    fs.writeFileSync(aPath, aSource);
    const linter = new Linter({ configType: 'flat', cwd: sub });
    return linter
      .verify(
        aSource,
        [
          {
            files: ['**/*.ts'],
            languageOptions: {
              parser: parser as never,
              ecmaVersion: 2022,
              sourceType: 'module',
            },
            plugins: { i: { rules: { 'no-cycle': noCycle as never } } },
            rules: { 'i/no-cycle': 'error' },
          },
        ],
        aPath,
      )
      .filter((m) => m.ruleId === 'i/no-cycle').length;
  };
  const A =
    'import { validate } from "./b.js";\nexport interface Config { v: number }\nexport const run = () => validate({});\n';

  it('a value import before the `import type` (no semicolons, as lynx-stack writes it) is not a cycle', () => {
    const B =
      'import fs from "node:fs"\n\nimport type { Config } from "./a.js"\nexport function validate(i: unknown): Config { void fs; return i as Config; }\n';
    if (lint(A, B) !== 0)
      throw new Error('reported a cycle through `import type`');
  });

  it('a real value cycle is still reported', () => {
    const B =
      'import { run } from "./a.js";\nexport function validate(i: unknown) { return run() ?? i; }\n';
    if (lint(A, B) === 0) throw new Error('missed a real cycle');
  });
});

/*
 * The oracle. The cases above are written down once; these run the SAME code through
 * eslint-plugin-import 2.32.0 itself and require the same number of findings, so a
 * future upstream release that moves, or a repro that was never true, fails here
 * instead of being believed. Run through `fixupPluginRules` as the parity grader does,
 * because upstream 2.32.0 calls context methods ESLint 10 removed.
 */
const upstream = fixupPluginRules(
  createRequire(import.meta.url)('eslint-plugin-import'),
);
const nextPlugin = {
  rules: {
    extensions,
    'consistent-type-specifier-style': consistentTypeSpecifierStyle,
    'no-unresolved': noUnresolved,
    'no-commonjs': noCommonjs,
  },
};
const verdict = (
  plugin: unknown,
  rule: string,
  code: string,
  options: unknown[] = [],
  settings: Record<string, unknown> = {},
): number => {
  const linter = new Linter({ configType: 'flat', cwd: dir });
  return linter
    .verify(
      code,
      [
        {
          files: ['**/*.ts'],
          languageOptions: {
            parser: parser as never,
            ecmaVersion: 2022,
            sourceType: 'module',
          },
          plugins: { import: plugin as never },
          settings,
          rules: { [`import/${rule}`]: ['error', ...options] } as never,
        },
      ],
      filename,
    )
    .filter((m) => m.ruleId === `import/${rule}`).length;
};

describe('graded by the incumbent: same code, same count as eslint-plugin-import', () => {
  const ts = {
    'import/resolver': {
      typescript: { project: path.join(dir, 'tsconfig.json') },
    },
  };
  const cases: [
    string,
    string,
    string,
    unknown[]?,
    Record<string, unknown>?,
  ][] = [
    [
      'extensions',
      'ESM spelling of a.ts',
      "import { a } from './a.js';",
      ['ignorePackages'],
    ],
    [
      'extensions',
      'no extension written',
      "import { a } from './a';",
      ['ignorePackages'],
    ],
    [
      'consistent-type-specifier-style',
      'bare, top-level type',
      "import type { S } from 'node:fs';",
    ],
    [
      'consistent-type-specifier-style',
      'bare, inline type',
      "import { type F } from 'node:os';",
    ],
    [
      'consistent-type-specifier-style',
      'prefer-inline, top-level type',
      "import type { S } from 'node:fs';",
      ['prefer-inline'],
    ],
    [
      'no-commonjs',
      '__dirname',
      "import { join } from 'node:path';\nexport const d = join(__dirname, 'x');",
    ],
    ['no-commonjs', 'require', "const fs = require('fs'); export {};"],
    [
      'no-unresolved',
      '.jsx for .tsx',
      "import { App } from './App.jsx';",
      [],
      ts,
    ],
    [
      'no-unresolved',
      '.js for .d.ts',
      "import { data } from './data.js';",
      [],
      ts,
    ],
    ['no-unresolved', 'unresolved', "import { x } from './nothing';", [], ts],
  ];
  for (const [rule, name, code, options, settings] of cases) {
    it(`${rule}: ${name}`, () => {
      const theirs = verdict(upstream, rule, code, options, settings);
      const ours = verdict(nextPlugin, rule, code, options, settings);
      if (ours !== theirs) {
        throw new Error(
          `upstream reports ${theirs}, import-next reports ${ours}`,
        );
      }
    });
  }
});
