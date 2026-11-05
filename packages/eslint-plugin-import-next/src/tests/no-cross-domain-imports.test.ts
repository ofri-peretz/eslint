/**
 * Comprehensive tests for no-cross-domain-imports rule
 * Architecture: Prevents imports across domain/feature boundaries
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noCrossDomainImports } from '../rules/no-cross-domain-imports';

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

describe('no-cross-domain-imports', () => {
  describe('Valid Code', () => {
    ruleTester.run(
      'valid - same domain or shared modules',
      noCrossDomainImports,
      {
        valid: [
          {
            name: 'a sibling import',
            code: `
            import { helper } from './helper';
          `,
            filename: 'domains/user/user-service.ts',
          },
          {
            code: `
            import { utils } from '../../shared/utils';
          `,
            filename: 'domains/user/user-service.ts',
          },
          {
            code: `
            import { lib } from 'external-lib';
          `,
            filename: 'domains/user/user-service.ts',
          },
          {
            code: `
            import { helper } from '../helper';
          `,
            filename: 'domains/user/user-service.ts',
          },
        ],
        invalid: [],
      },
    );
  });

  describe('Invalid Code - Cross-Domain Imports', () => {
    ruleTester.run('invalid - imports across domains', noCrossDomainImports, {
      valid: [],
      invalid: [
        {
          name: "an import that reaches into another domain's internals",
          code: `
            import { orderService } from '../../domains/order/order-service';
          `,
          filename: 'domains/user/user-service.ts',
          errors: [{ messageId: 'crossDomainImport' }],
        },
        {
          code: `
            import { productHelper } from '../product/helper';
          `,
          filename: 'features/user/user-feature.ts',
          errors: [{ messageId: 'crossDomainImport' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - custom domain patterns', noCrossDomainImports, {
      valid: [
        // Dynamic import with non-literal (should be skipped)
        {
            code: `import(someVar);`,
            filename: 'domains/user/user-service.ts'
        },
        // Custom rules - Allowed
        {
            code: `import { shared } from '../../features/shared/utils';`,
            filename: 'features/legacy/old.ts',
            options: [{
                customRules: [{
                    from: 'features/legacy',
                    to: ['features/shared'],
                    allowed: ['utils']
                }]
            }]
        }
      ],
      invalid: [
        {
          name: 'a sibling folder under a domain directory is another domain',
          code: `
            import { helper } from '../other/helper';
          `,
          filename: 'modules/user/user-module.ts',
          options: [{ domainPatterns: ['modules'] }],
          errors: [{ messageId: 'crossDomainImport' }],
        },
        {
          code: `
            import { helper } from '../../modules/other/helper';
          `,
          filename: 'modules/user/user-module.ts',
          options: [{ domainPatterns: ['modules'] }],
          errors: [{ messageId: 'crossDomainImport' }],
        },
        // Custom rules - Restricted
        {
            code: `import { secret } from '../../features/internal/secret';`,
            filename: 'features/legacy/old.ts',
            options: [{
                customRules: [{
                    from: 'features/legacy',
                    to: ['features/internal']
                }]
            }],
            errors: [{ messageId: 'crossDomainImport' }]
        }
      ],
    });
  });

  // Found by the fidelity model (benchmarks/suites/fidelity/models/import-next).
  describe('fidelity: the target domain is the path the import resolves to', () => {
    ruleTester.run('no-cross-domain-imports fidelity', noCrossDomainImports, {
      valid: [
        {
          name: 'the same domain, reached through its parent directory',
          code: "import { repo } from '../user/repo';",
          filename: 'src/domains/user/handler.ts',
        },
        {
          name: 'a shared directory inside another domain',
          code: "import { x } from '../billing/shared/x';",
          filename: 'src/domains/user/handler.ts',
        },
        {
          name: 'a custom rule allows the resolved target',
          code: "import { api } from '../billing/api/x';",
          filename: 'src/domains/user/handler.ts',
          options: [
            {
              customRules: [
                {
                  from: 'domains/user',
                  to: ['domains/billing'],
                  allowed: ['domains/billing/api'],
                },
              ],
            },
          ],
        },
      ],
      invalid: [
        {
          name: 'a sibling domain whose name is not special',
          code: "import { invoice } from '../billing/service';",
          filename: 'src/domains/user/handler.ts',
          errors: [{ messageId: 'crossDomainImport' }],
        },
        {
          name: 'export * from another domain',
          code: "export * from '../billing/service';",
          filename: 'src/domains/user/handler.ts',
          errors: [{ messageId: 'crossDomainImport' }],
        },
        {
          name: 'require() of another domain',
          code: "const billing = require('../billing/service');",
          filename: 'src/domains/user/handler.ts',
          errors: [{ messageId: 'crossDomainImport' }],
        },
        {
          name: 'import x = require() of another domain',
          code: "import billing = require('../billing/service');",
          filename: 'src/domains/user/handler.ts',
          errors: [{ messageId: 'crossDomainImport' }],
        },
      ],
    });
  });
});

// Spellings that load no module, or load one the rule does not judge.
ruleTester.run('no-cross-domain-imports fidelity (other spellings)', noCrossDomainImports, {
  valid: [
    {
      name: "a call that is not require, and an import alias, load nothing",
      code: "load('../billing/service');\nnamespace NS { export const b = 1; }\nimport A = NS.b;\nexport const v = A;\nexport { A };",
      filename: "src/domains/user/handler.ts",
    },
  ],
  invalid: [

  ],
});
