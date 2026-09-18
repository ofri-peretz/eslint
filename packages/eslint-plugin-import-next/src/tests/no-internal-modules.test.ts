/**
 * Comprehensive tests for no-internal-modules rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInternalModules } from '../rules/no-internal-modules';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-internal-modules', () => {
  describe('Basic Detection', () => {
    ruleTester.run('detect deep imports', noInternalModules, {
      valid: [
        {
          name: 'the package entry',
          code: "import lodash from 'lodash';",
        },
        {
          code: "import { useState } from 'react';",
        },
        {
          code: "import '@company/design-system';",
        },
        {
          code: "import something from './index';",
          options: [{ maxDepth: 1 }],
        },
      ],
      invalid: [
        {
          name: "a deep import past the package's entry point",
          code: "import get from 'lodash/get';",
          options: [{ maxDepth: 0 }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
        {
          code: "import { Button } from '@company/ui/components/Button';",
          options: [{ maxDepth: 1 }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
        {
          code: "import utils from './utils/helpers';",
          options: [{ maxDepth: 0 }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
      ],
    });
  });

  describe('Strategy: error', () => {
    ruleTester.run('error strategy', noInternalModules, {
      valid: [],
      invalid: [
        {
          code: "import get from 'lodash/get';",
          options: [{ strategy: 'error', maxDepth: 0 }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
      ],
    });
  });

  describe('Strategy: autofix', () => {
    ruleTester.run('autofix strategy', noInternalModules, {
      valid: [
        {
          /*
           * The specifier the autofix writes must be a fixpoint: at
           * `maxDepth` it no longer violates the rule, so `--fix` converges in
           * one pass instead of walking the specifier further down on each
           * pass until nothing but `'.'` is left.
           */
          name: 'the ./ barrel the autofix writes is itself clean under the same options',
          code: "import { Command } from './commander';",
          options: [{ strategy: 'autofix', maxDepth: 1 }],
        },
      ],
      invalid: [
        {
          code: "import get from 'lodash/get';",
          options: [{ strategy: 'autofix', maxDepth: 0 }],
          output: "import get from 'lodash';",
          errors: [{ messageId: 'internalModuleImport' }],
        },
        {
          code: "import { Button } from '@company/ui/components/Button';",
          options: [{ strategy: 'autofix', maxDepth: 1 }],
          output: "import { Button } from '@company/ui';",
          errors: [{ messageId: 'internalModuleImport' }],
        },
        {
          code: "import utils from './utils/helpers/format';",
          options: [{ strategy: 'autofix', maxDepth: 0 }],
          output: "import utils from '.';",
          errors: [{ messageId: 'internalModuleImport' }],
        },
        {
          /*
           * The message names the edit the fixer makes. Every other autofix
           * case here runs at `maxDepth: 0`, where the suggested path and the
           * root import are the same string — so the suite could not tell them
           * apart, and at `maxDepth: 1` the report read `Import from "./src"`
           * while the fixer wrote `'.'`.
           *
           * CORRECTED: this case asserts message/fixer AGREEMENT, and it used
           * to record that agreement at the WRONG string — `'.'`, the
           * importing file's own directory. The claim it makes is unchanged;
           * the string both sides now agree on is `./src`, the barrel that
           * owns the target.
           */
          name: 'the autofix message names the specifier it actually writes',
          code: "import x from './src/utils/helper';",
          options: [{ strategy: 'autofix', maxDepth: 1 }],
          output: "import x from './src';",
          errors: [
            {
              messageId: 'internalModuleImport',
              data: {
                importPath: './src/utils/helper',
                depth: '3',
                maxDepth: '1',
                suggestedPath: './src',
              },
            },
          ],
        },
        {
          /*
           * The owner of `./commander/command.js` is the barrel `./commander`,
           * not `.` — the IMPORTING file's own directory, a different module.
           * `.` resolves to `src/index.ts`, which does not export `Command`,
           * and the autofix leaves no report behind, so the breakage is
           * silent. This is the same standard the rule already applies to
           * packages (`lodash/get` -> `lodash`) and to `../` traversal.
           *
           * Measured on burgee-style `pkg/src/commander.ts`.
           */
          name: 'autofix rewrites a ./ deep specifier to the barrel that owns it, never to the own directory of the importing file',
          code: "import { Command } from './commander/command.js';",
          options: [{ strategy: 'autofix', maxDepth: 1 }],
          output: "import { Command } from './commander';",
          errors: [
            {
              messageId: 'internalModuleImport',
              data: {
                importPath: './commander/command.js',
                depth: '2',
                maxDepth: '1',
                suggestedPath: './commander',
              },
            },
          ],
        },
        {
          /*
           * Three distinct modules must stay three distinct specifiers. The
           * collapse to a single `'.'` is not merely unresolvable, it is
           * lossy: no later pass can recover which module each line meant.
           */
          name: 'autofix keeps sibling ./ deep specifiers distinct instead of collapsing them onto one specifier',
          code: [
            "import { Command } from './commander/command.js';",
            "import { Option } from './parser/option.js';",
            "export { Help } from './help/help.js';",
          ].join('\n'),
          options: [{ strategy: 'autofix', maxDepth: 1 }],
          output: [
            "import { Command } from './commander';",
            "import { Option } from './parser';",
            "export { Help } from './help';",
          ].join('\n'),
          errors: [
            { messageId: 'internalModuleImport' },
            { messageId: 'internalModuleImport' },
            { messageId: 'internalModuleImport' },
          ],
        },
        {
          /*
           * Regression guard for the traversal branch of `getRootImport`,
           * which was already correct before the `./` branch was fixed: a
           * deep `../` specifier keeps its prefix rather than collapsing onto
           * the importing file's own directory.
           */
          name: 'autofix still keeps the ../ traversal prefix of a deep parent specifier at maxDepth 1',
          code: "import cfg from '../config/app/dev.js';",
          options: [{ strategy: 'autofix', maxDepth: 1 }],
          output: "import cfg from '..';",
          errors: [{ messageId: 'internalModuleImport' }],
        },
        {
          /*
           * A `../` specifier must keep its traversal prefix. Collapsing it to
           * '.' repoints the import at the CURRENT file's own directory index —
           * a different module — and the fix leaves no report behind, so the
           * swap is silent.
           *
           * burgee apps/docs/.source/server.ts:2
           */
          name: 'autofix keeps the parent traversal of a ../ specifier',
          code: "import * as m from '../content/docs/x.mdx';",
          options: [{ strategy: 'autofix', maxDepth: 0 }],
          output: "import * as m from '..';",
          errors: [{ messageId: 'internalModuleImport' }],
        },
        {
          name: 'autofix keeps every level of a ../../ specifier',
          code: "import * as m from '../../a/b';",
          options: [{ strategy: 'autofix', maxDepth: 0 }],
          output: "import * as m from '../..';",
          errors: [{ messageId: 'internalModuleImport' }],
        },
      ],
    });
  });

  describe('Strategy: suggest', () => {
    ruleTester.run('suggest strategy', noInternalModules, {
      valid: [],
      invalid: [
        {
          code: "import get from 'lodash/get';",
          options: [{ strategy: 'suggest', maxDepth: 0 }],
          errors: [
            {
              messageId: 'internalModuleImport',
              suggestions: [
                {
                  messageId: 'suggestPublicApi',
                  output: "import get from 'lodash';",
                },
              ],
            },
          ],
        },
        {
          /*
           * `suggest` applies the identical edit through a suggestion instead
           * of a fix, so it carries the identical hazard: the offered
           * specifier must name the barrel that owns the target, not `.`.
           */
          name: 'the suggested rewrite of a ./ deep specifier names the owning barrel, not the own directory of the importing file',
          code: "import { Command } from './commander/command.js';",
          options: [{ strategy: 'suggest', maxDepth: 1 }],
          errors: [
            {
              messageId: 'internalModuleImport',
              suggestions: [
                {
                  messageId: 'suggestPublicApi',
                  output: "import { Command } from './commander';",
                },
              ],
            },
          ],
        },
        {
          /*
           * Regression guard: the traversal branch is unchanged by the `./`
           * fix — a `../` specifier still keeps its prefix in suggestions.
           */
          name: 'the suggested rewrite of a ../ deep specifier still keeps its traversal prefix',
          code: "import cfg from '../config/app/dev.js';",
          options: [{ strategy: 'suggest', maxDepth: 1 }],
          errors: [
            {
              messageId: 'internalModuleImport',
              suggestions: [
                {
                  messageId: 'suggestPublicApi',
                  output: "import cfg from '..';",
                },
                {
                  messageId: 'suggestBarrelExport',
                  output: "import cfg from '../config/app';",
                },
              ],
            },
          ],
        },
        {
          /*
           * CORRECTED alongside the autofix branch: the public-API suggestion
           * used to offer `'.'` for a `./` specifier. Both offers now name a
           * real owner — `./utils` at `maxDepth`, and the immediate barrel
           * `./utils/helpers` — and they stay distinct from each other.
           */
          name: 'a ./ deep specifier is offered both its maxDepth entry point and its immediate barrel',
          code: "import { util } from './utils/helpers/format';",
          options: [{ strategy: 'suggest', maxDepth: 1 }],
          errors: [
            {
              messageId: 'internalModuleImport',
              suggestions: [
                {
                  messageId: 'suggestPublicApi',
                  output: "import { util } from './utils';",
                },
                {
                  messageId: 'suggestBarrelExport',
                  output: "import { util } from './utils/helpers';",
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('maxDepth Option', () => {
    ruleTester.run('max depth control', noInternalModules, {
      valid: [
        {
          code: "import { Button } from '@company/ui/components';",
          options: [{ maxDepth: 1 }],
        },
        {
          code: "import get from 'lodash/get';",
          options: [{ maxDepth: 1 }],
        },
        {
          code: "import utils from './utils/helpers';",
          options: [{ maxDepth: 2 }],
        },
      ],
      invalid: [
        {
          code: "import get from 'lodash/get';",
          options: [{ maxDepth: 0 }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
        {
          code: "import { Button } from '@company/ui/components/Button';",
          options: [{ maxDepth: 1 }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
        {
          code: "import utils from './utils/helpers/format';",
          options: [{ maxDepth: 1 }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
      ],
    });
  });

  describe('allow Option', () => {
    ruleTester.run('allow patterns', noInternalModules, {
      valid: [
        {
          code: "import get from 'lodash/get';",
          options: [{ allow: ['lodash/*'], maxDepth: 0 }],
        },
        {
          code: "import { Button } from '@company/ui/components/Button';",
          options: [{ allow: ['@company/ui/**'], maxDepth: 0 }],
        },
        {
          code: "import utils from './utils/helpers';",
          options: [{ allow: ['./utils/*'], maxDepth: 0 }],
        },
      ],
      invalid: [
        {
          code: "import isEmpty from 'lodash/isEmpty';",
          options: [{ allow: ['react/*'], maxDepth: 0 }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
      ],
    });
  });

  describe('forbid Option', () => {
    ruleTester.run('forbid patterns', noInternalModules, {
      valid: [],
      invalid: [
        {
          code: "import get from 'lodash/get';",
          options: [{ forbid: ['lodash/*'] }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
        {
          code: "import { Button } from '@company/ui/internal/Button';",
          options: [{ forbid: ['*/internal/*'] }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
      ],
    });
  });

  describe('ignorePaths Option', () => {
    ruleTester.run('ignore patterns', noInternalModules, {
      valid: [
        {
          code: "import get from 'lodash/get';",
          options: [{ ignorePaths: ['lodash/**'], maxDepth: 0 }],
        },
        {
          code: "import { Button } from '@company/ui/components/Button';",
          options: [{ ignorePaths: ['@company/**'], maxDepth: 0 }],
        },
        {
          code: "import utils from './test/utils';",
          options: [{ ignorePaths: ['./test/**'], maxDepth: 0 }],
        },
      ],
      invalid: [
        {
          code: "import get from 'lodash/get';",
          options: [{ ignorePaths: ['react/**'], maxDepth: 0 }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
      ],
    });
  });

  describe('Scoped Packages', () => {
    ruleTester.run('scoped package handling', noInternalModules, {
      valid: [
        {
          code: "import { useState } from '@org/package';",
          options: [{ maxDepth: 0 }],
        },
      ],
      invalid: [
        {
          code: "import { Button } from '@org/package/components';",
          options: [{ maxDepth: 0 }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
        {
          code: "import { util } from '@org/package/utils/helpers';",
          options: [{ maxDepth: 1 }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
      ],
    });
  });

  describe('Relative Imports', () => {
    ruleTester.run('relative import handling', noInternalModules, {
      valid: [
        {
          code: "import utils from './utils';",
          options: [{ maxDepth: 1 }],
        },
        {
          code: "import config from '../config';",
          options: [{ maxDepth: 1 }],
        },
      ],
      invalid: [
        {
          code: "import helper from './utils/helpers';",
          options: [{ maxDepth: 0 }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
        {
          code: "import format from '../utils/helpers/format';",
          options: [{ maxDepth: 1 }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
      ],
    });
  });

  describe('Export Statements', () => {
    ruleTester.run('export declaration handling', noInternalModules, {
      valid: [
        {
          code: "export { Button } from '@company/ui';",
          options: [{ maxDepth: 0 }],
        },
      ],
      invalid: [
        {
          code: "export { Button } from '@company/ui/components/Button';",
          options: [{ maxDepth: 0 }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
        {
          code: "export { get } from 'lodash/get';",
          options: [{ strategy: 'autofix', maxDepth: 0 }],
          output: "export { get } from 'lodash';",
          errors: [{ messageId: 'internalModuleImport' }],
        },
      ],
    });
  });

  describe('Complex Scenarios', () => {
    ruleTester.run('complex patterns', noInternalModules, {
      valid: [
        {
          code: "import { Button } from '@company/ui/internal/Button';",
          options: [{ allow: ['@company/ui/internal/*'], maxDepth: 0 }],
        },
      ],
      invalid: [
        {
          code: `
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import { Button } from '@company/ui/components/Button';
          `,
          options: [{ strategy: 'autofix', maxDepth: 0 }],
          output: `
import get from 'lodash';
import isEmpty from 'lodash';
import { Button } from '@company/ui';
          `,
          errors: [
            { messageId: 'internalModuleImport' },
            { messageId: 'internalModuleImport' },
            { messageId: 'internalModuleImport' },
          ],
        },
      ],
    });
  });

  describe('Edge Cases - depth boundary', () => {
    ruleTester.run('edge case - depth exactly at maxDepth', noInternalModules, {
      valid: [
        // Verify that depth exactly equal to maxDepth is allowed
        // ./utils/helpers has depth 2 (utils=1, helpers=2)
        {
          code: "import { util } from './utils/helpers';",
          options: [{ maxDepth: 2, forbid: [] }],
        },
        // ./utils has depth 1
        {
          code: "import { util } from './utils';",
          options: [{ maxDepth: 1, forbid: [] }],
        },
      ],
      invalid: [
        // depth > maxDepth triggers violation
        // ./utils/helpers/format has depth 3
        {
          code: "import { util } from './utils/helpers/format';",
          options: [{ maxDepth: 2, forbid: [] }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
      ],
    });
  });

  describe('Edge Cases - warn strategy', () => {
    ruleTester.run('warn strategy', noInternalModules, {
      valid: [],
      invalid: [
        {
          code: "import get from 'lodash/get';",
          options: [{ strategy: 'warn', maxDepth: 0 }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
      ],
    });
  });

  describe('ExportAllDeclaration', () => {
    ruleTester.run('export * from handling', noInternalModules, {
      valid: [
        {
          code: "export * from '@company/ui';",
          options: [{ maxDepth: 0 }],
        },
      ],
      invalid: [
        {
          code: "export * from '@company/ui/components/Button';",
          options: [{ maxDepth: 0 }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
        {
          code: "export * from 'lodash/get';",
          options: [{ maxDepth: 0 }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
      ],
    });
  });

  describe('require() calls', () => {
    ruleTester.run('require call handling', noInternalModules, {
      valid: [
        {
          code: "const lodash = require('lodash');",
          options: [{ maxDepth: 0 }],
        },
        {
          code: "const get = require('lodash/get');",
          options: [{ maxDepth: 1 }],
        },
      ],
      invalid: [
        {
          code: "const get = require('lodash/get');",
          options: [{ maxDepth: 0 }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
        {
          code: "const Button = require('@company/ui/components/Button');",
          options: [{ maxDepth: 1 }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
        {
          /*
           * The detector accepts a no-substitution template literal (via
           * `staticString`), but the fixers reached for `.source` on it and got
           * `undefined`, throwing out of `fixer.replaceText` and aborting the
           * lint for the entire file. Fix functions are evaluated at report
           * time, so plain `verify` crashed too — `--fix` was not required.
           */
          name: 'a template-literal require does not crash the autofixer',
          code: 'const get = require(`lodash/fp/get`);',
          options: [{ strategy: 'autofix', maxDepth: 0 }],
          output: "const get = require('lodash');",
          errors: [{ messageId: 'internalModuleImport' }],
        },
      ],
    });
  });

  describe('Dynamic imports', () => {
    ruleTester.run('import() expression handling', noInternalModules, {
      valid: [
        {
          code: "const lodash = import('lodash');",
          options: [{ maxDepth: 0 }],
        },
        {
          code: "const get = import('lodash/get');",
          options: [{ maxDepth: 1 }],
        },
      ],
      invalid: [
        {
          code: "const get = import('lodash/get');",
          options: [{ maxDepth: 0 }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
        {
          code: "const Button = import('@company/ui/components/Button');",
          options: [{ maxDepth: 1 }],
          errors: [{ messageId: 'internalModuleImport' }],
        },
      ],
    });
  });

  /*
   * Node subpath imports (`#…`, declared by package.json `imports`) are not
   * package names. `getRootImport` reaches them through its regular-package
   * branch, so the root it computes is the bare `#` — which cannot match a
   * pattern key like `#/*` and can never name a package either, so Node
   * throws ERR_PACKAGE_IMPORT_NOT_DEFINED on it. Reporting the depth is in
   * contract; rewriting the specifier to something that cannot resolve is the
   * same silent-swap defect already sealed for `../` traversal above.
   *
   * From burgee apps/docs/src/app/(home)/layout.tsx:1, whose package.json
   * declares `"imports": { "#/*": "./src/*" }`.
   */
  describe('Node subpath imports', () => {
    ruleTester.run(
      'subpath imports are reported but never rewritten',
      noInternalModules,
      {
        valid: [],
        invalid: [
          {
            name: 'a subpath import over maxDepth reports without an autofix',
            code: "import { baseOptions } from '#/lib/layout-shared';",
            options: [{ maxDepth: 1, strategy: 'autofix' }],
            output: null,
            errors: [{ messageId: 'internalModuleImport' }],
          },
          {
            name: 'a subpath import over maxDepth offers no root-import suggestion',
            code: "import { baseOptions } from '#/lib/layout-shared';",
            options: [{ maxDepth: 1, strategy: 'suggest' }],
            output: null,
            errors: [{ messageId: 'internalModuleImport', suggestions: [] }],
          },
        ],
      },
    );
  });
});
