/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `no-cycle` on the graph eslint-plugin-import sees, not a wider one.
 *
 * Measured on three real repositories with eslint-plugin-import 2.32.0 beside
 * this rule (2026-11-24): workadventure 27 findings against 59, big-AGI 43
 * against 39, Babylon.js 0 against 1. Two causes of the surplus, both fixed here:
 *
 *  1. Edges into files upstream never reads. Upstream's `ExportMapBuilder.get`
 *     returns null for a path whose extension is not in `import/extensions`
 *     (plus the `import/parsers` extensions), and for a path matching
 *     `import/ignore` (`src/exportMap/builder.js` lines 62-72 at v2.32.0, with
 *     `utils/ignore.js` for the extension set). The rule then has no module to
 *     walk, so a cycle through a `.svelte` file is invisible to it. This rule
 *     read `.svelte` files with a regex and reported the cycle.
 *  2. Edges that are only text. Upstream walks the parsed AST, so an
 *     `import "x"` inside a doc comment is no edge. This rule read the source
 *     with a regex and counted it.
 *
 * When neither `import/extensions` nor `import/parsers` is set, every extension
 * stays readable: a TypeScript-first default, kept because this rule's model
 * (benchmarks/suites/fidelity/models/import-next/no_cycle.qnt) lints `.ts`
 * files with no settings at all, where upstream would read none of them.
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
  // a.ts is linted; its text on disk is irrelevant, the linted source is passed in.
  'a.ts': 'export const a = 1;\n',
  // A component file: the cycle runs through it.
  'view.svelte': "import { a } from './a';\nexport const v = a;\n",
  // The same cycle, one hop further out.
  'b.ts': "import { v } from './view.svelte';\nexport const b = v;\n",
  // Imports that are only comments, and code that merely looks like comments.
  'doc.ts':
    '/**\n * Use it as: import "./a"\n */\n// import { a } from \'./a\';\nexport const d = 1;\n',
  'url.ts':
    "export const u = 'http://example.test/a';\nimport { a } from './a';\nexport const x = a;\n",
  'glob.ts':
    "export const g = `src/**/*.ts`;\nimport { a } from './a';\nexport const x = a;\n",
  'quote.ts':
    "export const r = /'/;\nimport { a } from './a';\nexport const x = a;\n",
  'dq.ts':
    'export const s = "// not a comment";\nimport { a } from "./a";\nexport const x = a;\n',
  // Two imports that reach the linted file through one shared hub.
  'two.ts':
    "import { b } from './hb';\nimport { c } from './hc';\nexport const t = [b, c];\n",
  'hb.ts': "import { h } from './hub';\nexport const b = h;\n",
  'hc.ts': "import { h } from './hub';\nexport const c = h;\n",
  'hub.ts': "import { t } from './two';\nexport const h = t;\n",
  'unterminated.ts':
    "import { a } from './a';\nexport const x = a;\n/* never closed, import './zzz'\n",
};

beforeAll(() => {
  dir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'no-cycle-settings-')),
  );
  for (const [name, text] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), text);
  }
});
afterAll(() => {
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});

const lint = (code: string, settings?: object): number => {
  clearCircularDependencyCache();
  const linter = new Linter({ configType: 'flat', cwd: dir });
  return linter
    .verify(
      code,
      [
        {
          files: ['**/*.ts'],
          languageOptions: {
            parser: tsParser as never,
            ecmaVersion: 2022,
            sourceType: 'module',
          },
          ...(settings ? { settings } : {}),
          plugins: {
            'import-next': { rules: { 'no-cycle': noCycle as never } },
          },
          rules: { 'import-next/no-cycle': 'error' },
        },
      ],
      path.join(dir, 'a.ts'),
    )
    .filter((m) => m.ruleId === 'import-next/no-cycle' || m.fatal).length;
};

const TS_ONLY = { 'import/extensions': ['.ts', '.tsx', '.js', '.jsx'] };
const PARSERS_ONLY = {
  'import/parsers': { '@typescript-eslint/parser': ['.ts', '.tsx'] },
};

describe('import/extensions: a file whose extension is not listed is not a module', () => {
  // upstream src/exportMap/builder.js lines 62-65 (v2.32.0)
  it('a cycle through a .svelte file is not reported', () => {
    expect(lint("import { v } from './view.svelte';", TS_ONLY)).toBe(0);
  });

  it('nor when it sits further along the chain', () => {
    expect(lint("import { b } from './b';", TS_ONLY)).toBe(0);
  });

  it('listing the extension brings the cycle back', () => {
    expect(
      lint("import { v } from './view.svelte';", {
        'import/extensions': ['.ts', '.svelte'],
      }),
    ).toBe(1);
  });

  it('import/parsers extensions are valid ones, and the default list is .js .mjs .cjs', () => {
    // upstream utils/ignore.js makeValidExtensionSet: `.svelte` is in neither
    expect(lint("import { v } from './view.svelte';", PARSERS_ONLY)).toBe(0);
  });

  it('with no settings every extension is read (this rule, not upstream)', () => {
    expect(lint("import { v } from './view.svelte';")).toBe(1);
  });

  // @found workadventure/workadventure 2026-11-24
  it('false positive: a Svelte component that imports its own store, as in workadventure', () => {
    expect(
      lint("import PopUp from './view.svelte';", {
        ...TS_ONLY,
        'import/external-module-folders': ['node_modules'],
      }),
    ).toBe(0);
  });
});

describe('import/ignore: a path matching it is not a module', () => {
  // upstream src/exportMap/builder.js lines 67-72 (v2.32.0)
  it('the linted file imports a matching path', () => {
    expect(
      lint("import { v } from './view.svelte';", {
        'import/ignore': ['\\.svelte$'],
      }),
    ).toBe(0);
  });

  it('a matching path along the chain', () => {
    expect(
      lint("import { b } from './b';", { 'import/ignore': ['view\\.svelte$'] }),
    ).toBe(0);
  });

  it('a pattern that matches nothing changes nothing', () => {
    expect(
      lint("import { b } from './b';", { 'import/ignore': ['nothing-here'] }),
    ).toBe(1);
  });
});

describe('an import inside a comment is not an edge', () => {
  // upstream walks the parsed AST (src/exportMap/builder.js `parse` + `visit`)
  // @found BabylonJS/Babylon.js 2026-11-24
  it('false positive: a doc comment that shows `import "./a"`, as in Babylon.js', () => {
    expect(lint("export * from './doc';")).toBe(0);
  });

  it('a real import after a `//` inside a string is still an edge', () => {
    expect(lint("import { x } from './url';")).toBe(1);
  });

  it('a real import after a double-quoted `//` is still an edge', () => {
    expect(lint("import { x } from './dq';")).toBe(1);
  });

  it('a real import after `/*` inside a template literal is still an edge', () => {
    expect(lint("import { x } from './glob';")).toBe(1);
  });

  it('a real import after a regular expression holding a quote is still an edge', () => {
    expect(lint("import { x } from './quote';")).toBe(1);
  });

  it('an unterminated block comment hides only what follows it', () => {
    expect(lint("import { x } from './unterminated';")).toBe(1);
  });
});

describe('deliberate divergence: every import that closes a cycle is reported', () => {
  // eslint-plugin-import keeps one module-level `traversed` set for the whole
  // file (src/rules/no-cycle.js lines 15, 125-126, 132 and 176 at v2.32.0), so
  // a module walked for the first import is skipped for the next. Of two
  // imports that reach the linted file through the same hub it reports only the
  // first: on workadventure that is the 22 findings here beyond its 27,
  // on big-AGI the 6 beyond its 43 (each sits after an upstream finding in the
  // same file). The second import is just as much a cycle, and which one
  // upstream names depends on source order. Not ported; recorded so the
  // difference is a decision and not a surprise.
  it('both imports through a shared hub are reported, upstream reports the first', () => {
    clearCircularDependencyCache();
    const code = fs.readFileSync(path.join(dir, 'two.ts'), 'utf8');
    const linter = new Linter({ configType: 'flat', cwd: dir });
    const messages = linter.verify(
      code,
      [
        {
          files: ['**/*.ts'],
          languageOptions: {
            parser: tsParser as never,
            ecmaVersion: 2022,
            sourceType: 'module',
          },
          plugins: {
            'import-next': { rules: { 'no-cycle': noCycle as never } },
          },
          rules: { 'import-next/no-cycle': 'error' },
        },
      ],
      path.join(dir, 'two.ts'),
    );
    expect(messages.map((m) => m.line)).toEqual([1, 2]);
  });
});
