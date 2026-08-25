/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `getFileImports` sees ES2022 arbitrary module namespace names.
 *
 * `import { "arbitrary-name" as x } from './y'` produced NO match under the
 * previous pattern — not a wrong path, nothing at all — so the edge never
 * entered the dependency graph. A rule cannot report on an edge it cannot see,
 * which made this a silent false negative in everything built on this helper,
 * `no-cycle` included, and that rule is `error` in `recommended`.
 *
 * The "already worked" block is the important half. Widening a regex is how you
 * break the forms that were fine, and the multi-import case is the specific
 * failure a too-greedy widening produces: one match swallowing the lines after
 * it and collapsing several edges into one.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createFileSystemCache, getFileImports } from './dependency-analysis';

let dir: string;
let seq = 0;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-regex-'));
  for (const name of ['a.ts', 'b.ts', 'c.ts']) {
    fs.writeFileSync(path.join(dir, name), 'export const x = 1;\n');
  }
});

afterAll(() => {
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});

/** Basenames of the files `getFileImports` resolves out of `source`. */
const importsIn = (source: string): string[] => {
  // A fresh filename per case: the helper caches by path, and a reused name
  // would return the previous case's answer.
  seq += 1;
  const file = path.join(dir, `subject-${seq}.ts`);
  fs.writeFileSync(file, source);
  return getFileImports(file, {
    workspaceRoot: dir,
    barrelExports: ['index.ts'],
    cache: createFileSystemCache(),
  })
    .map((i) => path.basename(i.path ?? ''))
    .filter(Boolean)
    .sort();
};

describe('getFileImports and ES2022 arbitrary module names', () => {
  it('sees an arbitrary-name import — the regression', () => {
    expect(importsIn('import { "odd-name" as Odd } from "./a";\n')).toEqual(['a.ts']);
  });

  it('sees several arbitrary names in one clause', () => {
    expect(importsIn('import { "a-1" as A, "b-2" as B } from "./a";\n')).toEqual(['a.ts']);
  });

  it('sees an arbitrary name mixed with ordinary bindings', () => {
    expect(importsIn('import D, { "x-y" as X, Z } from "./a";\n')).toEqual(['a.ts']);
  });

  describe('forms that already worked and must keep working', () => {
    it('named', () => {
      expect(importsIn('import { Foo } from "./a";\n')).toEqual(['a.ts']);
    });

    it('default', () => {
      expect(importsIn('import Foo from "./a";\n')).toEqual(['a.ts']);
    });

    it('namespace', () => {
      expect(importsIn('import * as Foo from "./a";\n')).toEqual(['a.ts']);
    });

    it('side-effect only', () => {
      expect(importsIn('import "./a";\n')).toEqual(['a.ts']);
    });

    it('inline type specifier', () => {
      expect(importsIn('import { type Foo, Bar } from "./a";\n')).toEqual(['a.ts']);
    });

    it('spanning several lines', () => {
      expect(importsIn('import {\n  Foo,\n  Bar,\n} from "./a";\n')).toEqual(['a.ts']);
    });

    it('several imports in one file stay separate', () => {
      expect(importsIn('import { A } from "./a";\nimport "./b";\nimport C from "./c";\n')).toEqual([
        'a.ts',
        'b.ts',
        'c.ts',
      ]);
    });
  });
});
