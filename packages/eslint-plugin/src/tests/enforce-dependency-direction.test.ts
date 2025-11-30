/**
 * Comprehensive tests for enforce-dependency-direction rule
 * Architecture: Ensures dependencies flow in the correct architectural direction
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { enforceDependencyDirection } from '../rules/architecture/enforce-dependency-direction';

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

describe('enforce-dependency-direction', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - correct dependency direction', enforceDependencyDirection, {
      valid: [
        {
          code: `
            import { domainEntity } from '../domain/entity';
          `,
          filename: 'application/service.ts',
        },
        {
          code: `
            import { applicationService } from '../application/service';
          `,
          filename: 'infrastructure/repository.ts',
        },
        {
          code: `
            import { helper } from './helper';
          `,
          filename: 'domain/entity.ts',
        },
        {
          code: `
            import { lib } from 'external-lib';
          `,
          filename: 'domain/entity.ts',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Dependency Direction Violations', () => {
    ruleTester.run('invalid - wrong dependency direction', enforceDependencyDirection, {
      valid: [],
      invalid: [
        {
          code: `
            import { infrastructureRepo } from '../infrastructure/repository';
          `,
          filename: 'domain/entity.ts',
          errors: [{ messageId: 'dependencyDirectionViolation' }],
        },
        {
          code: `
            import { applicationService } from '../application/service';
          `,
          filename: 'domain/entity.ts',
          errors: [{ messageId: 'dependencyDirectionViolation' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - custom layers', enforceDependencyDirection, {
      valid: [
        {
          code: `
            import { helper } from '../layer1/helper';
          `,
          filename: 'layer2/service.ts',
          options: [{ layers: ['layer1', 'layer2', 'layer3'] }],
        },
      ],
      invalid: [
        {
          code: `
            import { service } from '../layer3/service';
          `,
          filename: 'layer1/entity.ts',
          options: [{ layers: ['layer1', 'layer2', 'layer3'] }],
          errors: [{ messageId: 'dependencyDirectionViolation' }],
        },
      ],
    });
  });
});

