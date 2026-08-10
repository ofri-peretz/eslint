/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Coverage-gap tests for no-unsafe-copy-from: allowlist matching on the
 * template-literal and concatenation paths, unextractable file paths, and
 * statically unverifiable query arguments.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noUnsafeCopyFrom } from './index';

/**
 * Every fixture imports a PostgreSQL client, because the rule now abstains in
 * files that use no PostgreSQL at all. Wrapping the arrays rather than editing
 * each fixture means one cannot be left behind — a fixture missing the import
 * would pass vacuously on the gate instead of exercising the detection it was
 * written for.
 */
const withPg = (code: string): string => `import { Pool } from 'pg';\n${code}`;
const pg = <T,>(cases: T[]): T[] =>
  cases.map((c) =>
    typeof c === 'string'
      ? (withPg(c) as T)
      : ({ ...c, code: withPg((c as { code: string }).code) } as T),
  );


RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

describe('no-unsafe-copy-from — coverage gaps', () => {
  ruleTester.run('allowlist and path-extraction branches', noUnsafeCopyFrom, {
    valid: pg([
      {
        name: 'template literal (no expressions) with allowlisted path',
        code: 'client.query(`COPY t FROM \'/data/ok.csv\'`);',
        options: [{ allowedPaths: ['^/data/'] }],
      },
      {
        name: 'string concatenation of literals with allowlisted path',
        code: `client.query('COPY t ' + "FROM '/data/ok.csv'");`,
        options: [{ allowedPaths: ['^/data/'] }],
      },
      {
        name: 'string concatenation of literals with allowHardcodedPaths',
        code: `client.query('COPY t ' + "FROM '/etc/data.csv'");`,
        options: [{ allowHardcodedPaths: true }],
      },
      {
        name: 'call-expression query argument is statically unverifiable (skipped)',
        code: `client.query(buildQuery());`,
      },
      {
        name: 'member-expression query argument falls through all cases',
        code: `client.query(cfg.sql);`,
      },
    ]),
    invalid: pg([
      {
        name: 'COPY FROM PROGRAM has no extractable quoted path (still hardcoded)',
        code: `client.query("COPY t FROM PROGRAM 'gzip -dc backup.gz'");`,
        errors: [{ messageId: 'hardcodedPath' }],
      },
      {
        name: 'template-literal hardcoded path not matching the allowlist',
        code: 'client.query(`COPY t FROM \'/etc/passwd\'`);',
        options: [{ allowedPaths: ['^/data/'] }],
        errors: [{ messageId: 'hardcodedPath' }],
      },
      {
        name: 'concatenated hardcoded path not matching the allowlist',
        code: `client.query('COPY t ' + "FROM '/etc/passwd'");`,
        options: [{ allowedPaths: ['^/data/'] }],
        errors: [{ messageId: 'hardcodedPath' }],
      },
    ]),
  });
});
