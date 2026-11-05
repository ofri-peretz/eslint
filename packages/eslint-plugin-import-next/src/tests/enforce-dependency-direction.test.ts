/**
 * Comprehensive tests for enforce-dependency-direction rule
 * Architecture: Ensures dependencies flow in the correct architectural direction
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { enforceDependencyDirection } from '../rules/enforce-dependency-direction';

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
    ruleTester.run(
      'valid - correct dependency direction',
      enforceDependencyDirection,
      {
        valid: [
          {
            /*
             * `import(42)` is a Literal whose value is a NUMBER. The rule cast
             * every Literal source `as string` and called `.startsWith` on it,
             * which threw a TypeError and crashed ESLint for the whole file
             * rather than reporting anything. Found when the oxlint-parity
             * corpus stopped truncating harvested fixtures and this reached
             * the rule; the same defect was in no-cross-domain-imports.
             */
            name: 'a dynamic import of a numeric literal does not crash',
            code: `export async function boot() { return import(42); }`,
            filename: 'application/service.ts',
          },
          {
            name: 'a dynamic import of null does not crash',
            code: `export async function boot() { return import(null); }`,
            filename: 'application/service.ts',
          },
          {
            name: 'a domain module importing another domain entity',
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
      },
    );
  });

  describe('Invalid Code - Dependency Direction Violations', () => {
    ruleTester.run(
      'invalid - wrong dependency direction',
      enforceDependencyDirection,
      {
        valid: [],
        invalid: [
          {
            name: 'a domain module importing from infrastructure — the arrow points the wrong way',
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
      },
    );
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

  // Found by the fidelity model (benchmarks/suites/fidelity/models/import-next).
  describe('fidelity: allowSameLayer and every import spelling', () => {
    ruleTester.run(
      'enforce-dependency-direction fidelity',
      enforceDependencyDirection,
      {
        valid: [
          {
            name: 'a same-layer import is allowed by default',
            code: "import { x } from './x';",
            filename: 'src/domain/feature/file.ts',
          },
        ],
        invalid: [
          {
            name: 'allowSameLayer: false reports an import from the same layer',
            code: "import { x } from './x';",
            filename: 'src/domain/feature/file.ts',
            options: [{ allowSameLayer: false }],
            errors: [{ messageId: 'dependencyDirectionViolation' }],
          },
          {
            name: 'allowSameLayer: false reports the layer reached through its parent',
            code: "import { x } from '../../domain/x';",
            filename: 'src/domain/feature/file.ts',
            options: [{ allowSameLayer: false }],
            errors: [{ messageId: 'dependencyDirectionViolation' }],
          },
          {
            name: 'export * from an outer layer',
            code: "export * from '../../infrastructure/x';",
            filename: 'src/domain/feature/file.ts',
            errors: [{ messageId: 'dependencyDirectionViolation' }],
          },
          {
            name: 'require() of an outer layer',
            code: "const repo = require('../../infrastructure/x');",
            filename: 'src/domain/feature/file.ts',
            errors: [{ messageId: 'dependencyDirectionViolation' }],
          },
          {
            name: 'import x = require() of an outer layer',
            code: "import repo = require('../../infrastructure/x');",
            filename: 'src/domain/feature/file.ts',
            errors: [{ messageId: 'dependencyDirectionViolation' }],
          },
        ],
      },
    );
  });
});

// Spellings that load no module, or load one the rule does not judge.
ruleTester.run(
  'enforce-dependency-direction fidelity (other spellings)',
  enforceDependencyDirection,
  {
    valid: [
      {
        name: 'a target directory that is a layer pattern but not a listed layer',
        code: "import x from '../../ui/x';",
        filename: 'src/domain/feature/file.ts',
      },
      {
        name: 'a call that is not require, and an import alias, load nothing',
        code: "load('../../infrastructure/x');\nnamespace NS { export const b = 1; }\nimport A = NS.b;\nexport const v = A;\nexport { A };",
        filename: 'src/domain/feature/file.ts',
      },
    ],
    invalid: [],
  },
);
