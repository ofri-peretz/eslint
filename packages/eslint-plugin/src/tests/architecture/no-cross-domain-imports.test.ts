/**
 * Comprehensive tests for no-cross-domain-imports rule
 * Architecture: Prevents imports across domain/feature boundaries
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noCrossDomainImports } from '../../rules/architecture/no-cross-domain-imports';

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
    ruleTester.run('valid - same domain or shared modules', noCrossDomainImports, {
      valid: [
        {
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
    });
  });

  describe('Invalid Code - Cross-Domain Imports', () => {
    ruleTester.run('invalid - imports across domains', noCrossDomainImports, {
      valid: [],
      invalid: [
        {
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
        {
          code: `
            import { helper } from '../other/helper';
          `,
          filename: 'modules/user/user-module.ts',
          options: [{ domainPatterns: ['modules'] }],
        },
      ],
      invalid: [
        {
          code: `
            import { helper } from '../../modules/other/helper';
          `,
          filename: 'modules/user/user-module.ts',
          options: [{ domainPatterns: ['modules'] }],
          errors: [{ messageId: 'crossDomainImport' }],
        },
      ],
    });
  });
});

