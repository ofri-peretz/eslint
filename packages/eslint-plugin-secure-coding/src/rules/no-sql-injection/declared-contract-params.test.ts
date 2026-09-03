/**
 * A parameter bound by a NAMED type is not, on its own, an attacker inlet.
 *
 * `treatParametersAsUntrusted` (default `true`) closed a real gap — the commonest
 * shape there is, `export function search(term)` reaching `db.query`, was silent.
 * Then it was measured against 17,775 files of real source and produced **128
 * false positives in n8n alone**, every one of them a TypeORM migration:
 *
 *   async up({ queryRunner, tablePrefix }: MigrationContext) { … }
 *   async up(context: MigrationContext) { const { tablePrefix } = context; … }
 *
 * The caller is the framework's own migration runner, the value is deployment
 * config, and there is no attacker in that path. Reporting CVSS 9.8 on it is how
 * a maintainer switches the plugin off — which costs every other finding too.
 *
 * The evidence that separates the two is the annotation, not the spelling. A bare
 * `term`, or `term: string`, constrains a caller to nothing. A binding pulled from
 * a named type is bound by a contract this codebase declares.
 *
 * These cases are the FP lock. Each was probed before it was written, and the
 * measured effect was 128 -> 9 findings on n8n with the corpus unmoved at
 * 100% F1 / 0 FP / 0 FN.
 *
 * NOTE ON RECALL: `export function handler({ body }: Request)` — a genuine
 * injection through a typed request destructure — was ALREADY invisible to this
 * rule before the narrowing, verified by probe. So this costs no detection.
 * Request-shaped provenance belongs to the `requestRoots`/`requestProperties`
 * path, and that it does not yet reach this shape is a separate pre-existing gap.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSqlInjection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-sql-injection — a declared contract is not an inlet', () => {
  ruleTester.run('no-sql-injection', noSqlInjection, {
    valid: [
      {
        name: 'n8n shape: destructured in the parameter, annotated with a named type',
        code: `async function up({ queryRunner, tablePrefix }: MigrationContext) {
          await queryRunner.query(\`INSERT INTO \${tablePrefix}role VALUES (1)\`);
        }`,
      },
      {
        name: 'n8n shape: annotated parameter, destructured one line later',
        code: `async function up(context: MigrationContext) {
          const { queryRunner, tablePrefix } = context;
          await queryRunner.query(\`DROP TABLE "\${tablePrefix}workflow_entity";\`);
        }`,
      },
      {
        name: 'a named type on an array pattern is a contract too',
        code: `function run([prefix]: MigrationTuple) {
          return db.query(\`SELECT * FROM \${prefix}t\`);
        }`,
      },
    ],
    invalid: [
      {
        // The positive control. Without this the three valid cases above could
        // pass because the rule is broken rather than because it is precise.
        name: 'CONTROL: an unannotated parameter is still an inlet',
        code: `export function search(term) {
          return db.query(\`SELECT * FROM t WHERE n = \${term}\`);
        }`,
        errors: [{ messageId: 'sqlInjection' }],
      },
      {
        name: 'a primitive annotation constrains a caller to nothing',
        code: `export function search(term: string) {
          return db.query(\`SELECT * FROM t WHERE n = \${term}\`);
        }`,
        errors: [{ messageId: 'sqlInjection' }],
      },
      {
        name: 'an inline literal type is what you write when there is no interface',
        code: `export function search({ term }: { term: string }) {
          return db.query(\`SELECT * FROM t WHERE n = \${term}\`);
        }`,
        errors: [{ messageId: 'sqlInjection' }],
      },
      {
        name: 'a destructured parameter with no annotation at all',
        code: `export function search({ term }) {
          return db.query(\`SELECT * FROM t WHERE n = \${term}\`);
        }`,
        errors: [{ messageId: 'sqlInjection' }],
      },
    ],
  });
});
