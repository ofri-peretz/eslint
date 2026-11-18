/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `no-cycle` under eslint-plugin-import's option names, with its meaning.
 *
 * A config carried over from `import/no-cycle` must load AND lint the same:
 * accepting `commonjs` and then ignoring it would be worse than rejecting it.
 * Each option below is exercised both ways, on a real graph on disk.
 *
 * The linted file `a.js` is on disk as a comment only. The source handed to
 * the linter is what imports — as in an unsaved editor buffer, or as in every
 * one of eslint-plugin-import's own `no-cycle` cases, which lint
 * `depth-zero.js` with code that file does not contain. The rule used to read
 * the linted file's edges from disk only, and missed all of them (graded by
 * benchmarks/suites/ilb-competitor-parity/import-drop-in.mts).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { noCycle, clearCircularDependencyCache } from '../rules/no-cycle';

let dir: string;
const files: Record<string, string> = {
  'a.js': '// the linted source differs from disk\n',
  'b.js': "import { a } from './a';\nexport const b = a;\n",
  'c.js': "import { d } from './d';\nexport const c = d;\n",
  'd.js': "import { a } from './a';\nexport const d = a;\n",
  'dyn.js': "export const load = () => import('./a');\n",
  't.ts':
    "import type { A } from './a';\nexport type T = A;\nexport const t = 1;\n",
  'it.ts':
    "import { type A } from './a';\nexport type T = A;\nexport const t = 1;\n",
  'vendor/v.js': "import { a } from '../a';\nexport const v = a;\n",
  'e.js': "import { v } from './vendor/v';\nexport const e = v;\n",
  'm.js':
    "import { n } from './n';\nimport { o } from './o';\nexport const m = [n, o];\n",
  'n.js': "import { o } from './o';\nexport const n = o;\n",
  'o.js': 'export const o = 1;\n',
  'z.js': "import { m } from './m';\n",
};

beforeAll(() => {
  dir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'no-cycle-upstream-')),
  );
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), text);
  }
});
afterAll(() => {
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});

const lint = (
  code: string,
  options?: object,
  {
    file = 'a.js',
    settings,
    ts = false,
  }: { file?: string; settings?: object; ts?: boolean } = {},
): number => {
  clearCircularDependencyCache();
  const linter = new Linter({ configType: 'flat', cwd: dir });
  return linter
    .verify(
      code,
      [
        {
          files: ['**/*.js', '**/*.ts'],
          languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            ...(ts ? { parser: tsParser as never } : {}),
          },
          ...(settings ? { settings } : {}),
          plugins: {
            'import-next': { rules: { 'no-cycle': noCycle as never } },
          },
          rules: {
            'import-next/no-cycle': options ? ['error', options] : 'error',
          },
        },
      ],
      path.join(dir, file),
    )
    .filter((m) => m.ruleId === 'import-next/no-cycle' || m.fatal).length;
};

describe('no-cycle reads the linted file from the source being linted', () => {
  it('a cycle the file on disk does not have yet', () => {
    expect(lint("import { b } from './b';")).toBe(1);
  });

  it('two hops back', () => {
    expect(lint("import { c } from './c';")).toBe(1);
  });

  it('no cycle: a diamond that never comes back', () => {
    expect(lint("import { m } from './m';")).toBe(0);
  });

  it('the file on disk already has the edge, and there is no cycle', () => {
    expect(lint("import { m } from './m';", undefined, { file: 'z.js' })).toBe(
      0,
    );
  });

  it('a statement-level type import back does not close a cycle', () => {
    expect(lint("import { t } from './t';")).toBe(0);
  });

  it('an inline type import back does not close one either', () => {
    expect(lint("import { t } from './it';")).toBe(0);
  });

  it('unless verbatimModuleSyntax keeps the inline import', () => {
    expect(
      lint("import { t } from './it';", { verbatimModuleSyntax: true }),
    ).toBe(1);
  });

  it('a self-import is no-self-import territory', () => {
    expect(lint("import { a } from './a';")).toBe(0);
  });
});

describe('maxDepth', () => {
  it('1 stops before the second hop', () => {
    expect(lint("import { c } from './c';", { maxDepth: 1 })).toBe(0);
  });

  it("'∞' is unlimited", () => {
    expect(lint("import { c } from './c';", { maxDepth: '∞' })).toBe(1);
  });
});

describe('allowUnsafeDynamicCyclicDependency', () => {
  it('absent: an import() along the chain breaks the cycle', () => {
    expect(lint("import { load } from './dyn';")).toBe(0);
  });

  it('true: the same', () => {
    expect(
      lint("import { load } from './dyn';", {
        allowUnsafeDynamicCyclicDependency: true,
      }),
    ).toBe(0);
  });

  it('false: an import() along the chain is an edge', () => {
    expect(
      lint("import { load } from './dyn';", {
        allowUnsafeDynamicCyclicDependency: false,
      }),
    ).toBe(1);
  });

  it('false: an import() in the linted file is an edge', () => {
    expect(
      lint("const f = () => import('./b');", {
        allowUnsafeDynamicCyclicDependency: false,
      }),
    ).toBe(1);
  });

  it('false: with no way back there is still nothing to report', () => {
    expect(
      lint("import { m } from './m';", {
        allowUnsafeDynamicCyclicDependency: false,
      }),
    ).toBe(0);
  });

  it('false: an import() whose specifier is not a string is skipped', () => {
    expect(
      lint('const f = (x) => [import(x), import(42)];', {
        allowUnsafeDynamicCyclicDependency: false,
      }),
    ).toBe(0);
  });

  it('absent: an import() in the linted file is not an edge', () => {
    expect(lint("const f = () => import('./b');")).toBe(0);
  });
});

describe('ignoreExternal', () => {
  const settings = { 'import/external-module-folders': ['vendor'] };

  it('off: a cycle through an external folder reports', () => {
    expect(lint("import { e } from './e';", undefined, { settings })).toBe(1);
  });

  it('on: a cycle through an external folder does not', () => {
    expect(
      lint("import { e } from './e';", { ignoreExternal: true }, { settings }),
    ).toBe(0);
  });

  it('on: an import of an external module is skipped', () => {
    expect(
      lint(
        "import { v } from './vendor/v';",
        { ignoreExternal: true },
        { settings },
      ),
    ).toBe(0);
  });

  it('on, with node_modules as the only external folder: a local cycle reports', () => {
    expect(lint("import { b } from './b';", { ignoreExternal: true })).toBe(1);
  });
});

describe('ignore', () => {
  it('a matching specifier is skipped', () => {
    expect(lint("import { b } from './b';", { ignore: ['^\\./b$'] })).toBe(0);
  });

  it('a specifier that does not match is checked', () => {
    expect(lint("import { b } from './b';", { ignore: ['^vendor'] })).toBe(1);
  });
});

describe('esmodule', () => {
  it('false: import and export-from declarations are skipped', () => {
    expect(
      lint(
        "import { b } from './b';\nexport { b as bb } from './b';\nexport * from './b';",
        { esmodule: false },
      ),
    ).toBe(0);
  });
});

describe('commonjs', () => {
  it('absent: a require() inside a function runs later, and is not an edge', () => {
    expect(lint("function f() { return require('./b'); }")).toBe(0);
  });

  it('true: every require() is an edge', () => {
    expect(
      lint("function f() { return require('./b'); }", { commonjs: true }),
    ).toBe(1);
  });

  it('false: no require() is an edge, top-level included', () => {
    expect(lint("const b = require('./b');", { commonjs: false })).toBe(0);
  });

  it('false: nor is a TypeScript import-equals require', () => {
    expect(
      lint(
        "import b = require('./b');",
        { commonjs: false },
        { file: 'a.ts', ts: true },
      ),
    ).toBe(0);
  });
});

describe('amd', () => {
  it("define(['./b'], …) is an edge", () => {
    expect(
      lint("define(['require', 'exports', , x, './b'], () => {});", {
        amd: true,
      }),
    ).toBe(1);
  });

  it("require(['./b'], …) is an edge", () => {
    expect(lint("require(['./b'], (b) => {});", { amd: true })).toBe(1);
  });

  it('a call that is not the AMD shape is not', () => {
    expect(
      lint(
        "define(['./b']);\ndefine('./b', () => {});\nlater(['./b'], () => {});",
        { amd: true },
      ),
    ).toBe(0);
  });

  it('off: define([...]) is not an edge', () => {
    expect(lint("define(['./b'], () => {});")).toBe(0);
  });
});

describe('disableScc', () => {
  it('is accepted, and findings are the same', () => {
    expect(lint("import { b } from './b';", { disableScc: true })).toBe(1);
    expect(lint("import { m } from './m';", { disableScc: true })).toBe(0);
  });
});
