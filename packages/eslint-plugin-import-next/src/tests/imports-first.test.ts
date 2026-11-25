/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `imports-first` is eslint-plugin-import 2.32.0's deprecated alias of `first`
 * (src/rules/imports-first.js: `{ ...first, meta: { ...first.meta,
 * deprecated: true, ... } }`). That plugin has no tests/src/rules/imports-first.js
 * (tests/src/rules lists only first.js), so there is no upstream case to port.
 * These tests prove the alias against `first` itself: the same reports, for the
 * same options, on the same code.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { Linter } from 'eslint';
import { describe, expect, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { first } from '../rules/first';
import { importsFirst } from '../rules/imports-first';
import { configs, rules } from '../index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('imports-first', () => {
  ruleTester.run('imports-first', importsFirst, {
    valid: [
      {
        name: 'imports first',
        code: "import foo from 'foo'; import bar from 'bar'; const a = 1;",
      },
      {
        name: 'a directive in the prologue may precede the imports',
        code: "'use strict'; import foo from 'foo';",
      },
      {
        name: 'absolute-first: packages before relative imports',
        code: "import foo from 'foo'; import bar from './bar';",
        options: ['absolute-first'],
      },
      {
        name: 'disable-absolute-first allows a package import after a relative one',
        code: "import bar from './bar'; import foo from 'foo';",
        options: ['disable-absolute-first'],
      },
    ],
    invalid: [
      {
        name: 'an import after a statement',
        code: "import foo from 'foo'; const a = 1; import bar from 'bar';",
        errors: [{ messageId: 'first' }],
      },
      {
        name: 'every import after a statement, not only the one right below it',
        code: "const a = 1; import foo from 'foo'; import bar from 'bar';",
        errors: [{ messageId: 'first' }, { messageId: 'first' }],
      },
      {
        name: 'a TS import-equals require after a statement',
        code: "const a = 1; import foo = require('foo');",
        errors: [{ messageId: 'first' }],
      },
      {
        name: 'absolute-first: a package import after a relative one',
        code: "import bar from './bar'; import foo from 'foo';",
        options: ['absolute-first'],
        errors: [{ messageId: 'absoluteFirst' }],
      },
    ],
  });

  const shapes = [
    "import a from 'a'; import b from './b';",
    "import b from './b'; import a from 'a';",
    "'use client'; import a from 'a';",
    "import a from 'a'; 'use client'; import b from 'b';",
    "const x = 1; import a from 'a'; import b from './b';",
    "import e = require('e'); const x = 1; import e2 = require('e2');",
    "import Alias = NS.Inner; import a from 'a';",
  ];
  const optionSets: unknown[][] = [
    [],
    ['absolute-first'],
    ['disable-absolute-first'],
  ];

  it('reports exactly what `first` reports, with every option', () => {
    const run = (
      ruleName: string,
      rule: unknown,
      code: string,
      opts: unknown[],
    ) => {
      const linter = new Linter({ configType: 'flat' });
      return linter
        .verify(
          code,
          [
            {
              files: ['**/*.ts'],
              languageOptions: { parser, sourceType: 'module' },
              plugins: { t: { rules: { [ruleName]: rule } } },
              rules: { [`t/${ruleName}`]: ['error', ...opts] },
            },
          ] as never,
          'a.ts',
        )
        .map((m) => [m.line, m.column, m.endLine, m.endColumn, m.message]);
    };
    let reported = 0;
    for (const code of shapes) {
      for (const opts of optionSets) {
        const viaAlias = run('imports-first', importsFirst, code, opts);
        const viaFirst = run('first', first, code, opts);
        expect(viaAlias, `${code} ${JSON.stringify(opts)}`).toEqual(viaFirst);
        reported += viaFirst.length;
      }
    }
    // A comparison of two empty lists would pass for a broken alias.
    expect(reported).toBeGreaterThan(10);
  });

  it('is deprecated, replaced by `first`, and shares the schema and messages of `first`', () => {
    expect(importsFirst.meta.deprecated).toBe(true);
    expect(importsFirst.meta.replacedBy).toEqual(['first']);
    expect(importsFirst.meta.schema).toBe(first.meta.schema);
    expect(importsFirst.meta.messages).toBe(first.meta.messages);
    expect(first.meta.deprecated).toBeUndefined();
  });

  it('is registered on the plugin under the name eslint-plugin-import uses', () => {
    expect(rules['imports-first']).toBe(importsFirst);
  });

  it('is enabled by no preset', () => {
    for (const [name, config] of Object.entries(configs)) {
      const enabled =
        (config as { rules?: Record<string, unknown> }).rules ?? {};
      expect(Object.keys(enabled), name).not.toContain(
        'import-next/imports-first',
      );
    }
  });
});
