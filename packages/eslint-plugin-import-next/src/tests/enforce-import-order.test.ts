import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { enforceImportOrder } from '../rules/enforce-import-order';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('enforce-import-order', () => {
  ruleTester.run('enforce-import-order', enforceImportOrder, {
    valid: [
      // Correct order: builtin -> external -> internal -> parent -> sibling
      {
        name: 'builtins, packages, aliases, parent, sibling',
        code: `
import fs from 'fs';
import React from 'react';
import { Button } from '@/components';
import { utils } from '../utils';
import { helper } from './helper';
`,
        options: [
          {
            groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
            newlinesBetween: 'never',
          },
        ],
      },
      // Correct order with newlines
      {
        code: `
import fs from 'fs';

import React from 'react';

import { Button } from '@/components';

import { utils } from '../utils';

import { helper } from './helper';
`,
        options: [
          {
            groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
            newlinesBetween: 'always',
          },
        ],
      },
      // Alphabetical sorting
      {
        code: `
import { a } from 'a';
import { b } from 'b';
`,
        options: [
          {
            groups: ['external'],
            alphabetize: { order: 'asc' },
          },
        ],
      },
      // Mixed imports with code (should be ignored if valid, or flagged if not contiguous - here valid because contiguous)
      {
        code: `
import a from 'a';
import b from 'b';

const x = 1;
`,
      },
    ],
    invalid: [
      {
        /*
         * A hashbang is not a statement and must survive the fix.
         *
         * ESLint models `#!/usr/bin/env node` as a comment, so it came back
         * from `getCommentsBefore` for the first import and the fixer wrote
         * the sorted imports over it — producing `'#!' can only be used at
         * the start of a file`. The file then stopped parsing, which silences
         * every other rule on it as well. Two scripts in ofri-peretz/blog
         * were corrupted this way by a single `--fix` (#942).
         *
         * The assertion that matters is `output`: it is the FIXED text, so a
         * fixer that moves the hashbang fails here rather than shipping.
         */
        name: 'the fixer never moves an import above a hashbang',
        code: `#!/usr/bin/env node
import { helper } from './helper';
import fs from 'fs';
`,
        output: `#!/usr/bin/env node
import fs from 'fs';

import { helper } from './helper';
`,
        errors: [{ messageId: 'importOrder' }],
        options: [
          {
            groups: ['builtin', 'sibling'],
            newlinesBetween: 'always',
          },
        ],
      },
      {
        /*
         * The other side of that pin. A directive is only a directive BEFORE
         * the first statement; between two imports it is an ordinary comment
         * that happens to be shaped like one. Excluding it from every import's
         * extended range while the replacement range still spanned it meant the
         * fixer did not move it — it deleted it, and left no report behind.
         */
        name: 'a directive-shaped comment between imports travels, it is not deleted',
        code: `import z from 'zzz';
// @ts-nocheck
import a from 'aaa';`,
        output: `// @ts-nocheck
import a from 'aaa';
import z from 'zzz';`,
        errors: [{ messageId: 'importOrder' }],
      },
      {
        /*
         * `@ts-nocheck` is position-fixed the same way a hashbang is:
         * TypeScript honours it only before the first statement. The fixer
         * treated it as a leading comment of the first import and carried it
         * down with that import, which still PARSES — so nothing surfaces —
         * while type checking is silently switched back on (or, for
         * `@ts-check` on a .js file, silently switched off).
         *
         * burgee apps/docs/.source/server.ts:1 — a generated file whose
         * `@ts-nocheck` header sits above 11 imports.
         */
        name: 'the fixer never moves an import above a @ts-nocheck pragma',
        code: `// @ts-nocheck
import { helper } from './helper';
import fs from 'fs';
`,
        output: `// @ts-nocheck
import fs from 'fs';

import { helper } from './helper';
`,
        errors: [{ messageId: 'importOrder' }],
        options: [
          {
            groups: ['builtin', 'sibling'],
            newlinesBetween: 'always',
          },
        ],
      },
      {
        /*
         * A triple-slash reference directive is equally position-fixed:
         * TypeScript stops honouring it after the first statement.
         */
        name: 'the fixer never moves an import above a triple-slash reference',
        code: `/// <reference types="node" />
import { helper } from './helper';
import fs from 'fs';
`,
        output: `/// <reference types="node" />
import fs from 'fs';

import { helper } from './helper';
`,
        errors: [{ messageId: 'importOrder' }],
        options: [
          {
            groups: ['builtin', 'sibling'],
            newlinesBetween: 'always',
          },
        ],
      },
      {
        /*
         * A pragma pins, an explanatory comment travels. Only the pragma is
         * position-fixed; the comment below it belongs to `./helper` and must
         * move with it, or the fix strands a comment over the wrong import.
         */
        name: 'a pragma is pinned while a per-import comment travels with its import',
        code: `// @ts-nocheck
// helper must be imported for its side effects
import { helper } from './helper';
import fs from 'fs';
`,
        output: `// @ts-nocheck
import fs from 'fs';

// helper must be imported for its side effects
import { helper } from './helper';
`,
        errors: [{ messageId: 'importOrder' }],
        options: [
          {
            groups: ['builtin', 'sibling'],
            newlinesBetween: 'always',
          },
        ],
      },
      // Incorrect group order
      {
        name: 'a relative import before a builtin',
        code: `
import { helper } from './helper';
import fs from 'fs';
`,
        output: `
import fs from 'fs';

import { helper } from './helper';
`,
        errors: [{ messageId: 'importOrder' }],
        options: [
          {
            groups: ['builtin', 'sibling'],
            newlinesBetween: 'always',
          },
        ],
      },
      // Incorrect alphabetical order
      {
        code: `
import { b } from 'b';
import { a } from 'a';
`,
        output: `
import { a } from 'a';
import { b } from 'b';
`,
        errors: [{ messageId: 'importOrder' }],
      },
      // Missing newlines between groups
      {
        code: `
import fs from 'fs';
import { helper } from './helper';
`,
        output: `
import fs from 'fs';

import { helper } from './helper';
`,
        errors: [{ messageId: 'importOrder' }],
        options: [
          {
            groups: ['builtin', 'sibling'],
            newlinesBetween: 'always',
          },
        ],
      },
      // Interspersed code (should report importsNotContiguous)
      {
        code: `
import fs from 'fs';
const x = 1;
import { helper } from './helper';
`,
        errors: [{ messageId: 'importsNotContiguous' }],
      },
    ],
  });
});
