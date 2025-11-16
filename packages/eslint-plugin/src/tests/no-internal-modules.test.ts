/**
 * Comprehensive tests for no-internal-modules rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInternalModules } from '../rules/architecture/no-internal-modules';

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
      valid: [],
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
          code: "import { util } from './utils/helpers/format';",
          options: [{ strategy: 'suggest', maxDepth: 1 }],
          errors: [
            {
              messageId: 'internalModuleImport',
              suggestions: [
                {
                  messageId: 'suggestPublicApi',
                  output: "import { util } from '.';",
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
          options: [{ ignorePaths: ['lodash/*'], maxDepth: 0 }],
        },
        {
          code: "import { Button } from '@company/ui/components/Button';",
          options: [{ ignorePaths: ['@company/*'], maxDepth: 0 }],
        },
        {
          code: "import utils from './test/utils';",
          options: [{ ignorePaths: ['./test/*'], maxDepth: 0 }],
        },
      ],
      invalid: [
        {
          code: "import get from 'lodash/get';",
          options: [{ ignorePaths: ['react/*'], maxDepth: 0 }],
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

  describe('Edge Cases - getViolationReason fallback (line 257)', () => {
    ruleTester.run('edge case - violation reason fallback', noInternalModules, {
      valid: [
        // Line 257 is the fallback return in getViolationReason when
        // isForbiddenPath is false AND depth <= maxDepth.
        // However, this path should never be reached because reportViolation
        // is only called when isForbiddenPath is true OR depth > maxDepth.
        // This test verifies that depth exactly equal to maxDepth is allowed.
        {
          code: "import { util } from './utils/helpers';",
          options: [{ maxDepth: 1, forbid: [] }],
        },
      ],
      invalid: [
        // To actually trigger a violation that would use the fallback reason,
        // we need depth > maxDepth. But in that case, it uses the "Exceeds maximum depth" message.
        // The fallback on line 257 is defensive code that shouldn't be reached.
        // We test it indirectly by ensuring violations work correctly.
        {
          code: "import { util } from './utils/helpers/format';",
          options: [{ maxDepth: 1, forbid: [] }],
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

});

