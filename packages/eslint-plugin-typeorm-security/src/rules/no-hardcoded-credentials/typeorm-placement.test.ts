/**
 * Placement lock: a postgres URL in a TypeORM config is reported ONCE.
 *
 * `new DataSource({ type: 'postgres', url: 'postgres://app:pw@db/app' })` was
 * reported by this rule and by `postgresql-security/no-hardcoded-credentials`,
 * so a project running both plugins got two CRITICAL findings on one string.
 * This plugin owns TypeORM configs (owner decision, 2026-10-18); the
 * postgresql rule skips them. Both rules run together here, from source.
 */
import { Linter } from 'eslint';
import { describe, it, expect } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noHardcodedCredentials } from './index';
import { noHardcodedCredentials as pgNoHardcodedCredentials } from '../../../../eslint-plugin-postgresql-security/src/rules/no-hardcoded-credentials';

const DSN = `'postgres://app:s3cret@db.prod.internal:5432/app'`;

const DATA_SOURCE = `import { DataSource } from 'typeorm';
export const ds = new DataSource({ type: 'postgres', url: ${DSN}, entities: [] });`;
const OPTIONS_CONST = `import { DataSource } from 'typeorm';
const options = { type: 'postgres', url: ${DSN} };
export const ds = new DataSource(options);`;
const FOR_ROOT = `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
@Module({ imports: [TypeOrmModule.forRoot({ type: 'postgres', url: ${DSN} })] })
export class AppModule {}`;
const ORMCONFIG = `export default { type: 'postgres', url: ${DSN}, entities: ['dist/**/*.js'] };`;

describe('postgresql-security + typeorm-security on one TypeORM config', () => {
  const lintBoth = (code: string) =>
    new Linter({ configType: 'flat' }).verify(
      code,
      [
        {
          files: ['**/*.ts'],
          plugins: {
            pg: {
              rules: { 'no-hardcoded-credentials': pgNoHardcodedCredentials },
            },
            typeorm: {
              rules: {
                'no-hardcoded-credentials': noHardcodedCredentials,
              },
            },
          } as never,
          rules: {
            'pg/no-hardcoded-credentials': 'error',
            'typeorm/no-hardcoded-credentials': 'error',
          },
          languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
        },
      ],
      { filename: 'src/data-source.ts' },
    );

  it.each([
    ['new DataSource({ … })', DATA_SOURCE],
    ['TypeORM options in a const', OPTIONS_CONST],
    ['TypeOrmModule.forRoot({ … })', FOR_ROOT],
    ['an ormconfig default export', ORMCONFIG],
  ])('%s is reported exactly once, by typeorm-security', (_name, code) => {
    const messages = lintBoth(code);
    expect(messages.map((m) => m.ruleId)).toEqual([
      'typeorm/no-hardcoded-credentials',
    ]);
  });

  it('a pg Pool DSN stays postgresql-security’s, once', () => {
    const messages = lintBoth(
      `import { Pool } from 'pg';\nexport const pool = new Pool({ connectionString: ${DSN} });`,
    );
    expect(messages.map((m) => m.ruleId)).toEqual([
      'pg/no-hardcoded-credentials',
    ]);
  });
});
