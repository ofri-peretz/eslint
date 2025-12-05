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
        code: `
import fs from 'fs';
import React from 'react';
import { Button } from '@/components';
import { utils } from '../utils';
import { helper } from './helper';
`,
        options: [{
            groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
            newlinesBetween: 'never' 
        }]
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
        options: [{
            groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
            newlinesBetween: 'always' 
        }]
      },
      // Alphabetical sorting
      {
        code: `
import { a } from 'a';
import { b } from 'b';
`,
        options: [{
            groups: ['external'],
            alphabetize: { order: 'asc' }
        }]
      },
      // Mixed imports with code (should be ignored if valid, or flagged if not contiguous - here valid because contiguous)
      {
        code: `
import a from 'a';
import b from 'b';

const x = 1;
`
      }
    ],
    invalid: [
      // Incorrect group order
      {
        code: `
import { helper } from './helper';
import fs from 'fs';
`,
        output: `
import fs from 'fs';

import { helper } from './helper';
`,
        errors: [{ messageId: 'importOrder' }],
        options: [{
            groups: ['builtin', 'sibling'],
            newlinesBetween: 'always'
        }]
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
        options: [{
            groups: ['builtin', 'sibling'],
            newlinesBetween: 'always'
        }]
      },
      // Interspersed code (should report importsNotContiguous)
      {
        code: `
import fs from 'fs';
const x = 1;
import { helper } from './helper';
`,
        errors: [{ messageId: 'importsNotContiguous' }],
      }
    ],
  });
});
