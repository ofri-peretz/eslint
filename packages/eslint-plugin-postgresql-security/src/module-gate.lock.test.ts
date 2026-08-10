/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression lock: no rule in this plugin reports in a file that uses no
 * PostgreSQL.
 *
 * Measured over 108,838 files in 108 repositories, 94% of everything this
 * plugin reported (1,222 of 1,305 findings) was in a file with no PostgreSQL
 * client — `no-missing-client-release` fired on `mongoose.connect()`,
 * `no-unsafe-query` on any `.query()`, `no-select-all` on any `SELECT *` in
 * any string. Two rules were wrong 100% of the time.
 *
 * This lock is written over the whole rule registry rather than per rule, so a
 * rule added later is covered the day it lands: it will fail here until it is
 * gated too. Revert the gate in any single rule and this test goes red.
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import plugin from './index';

const RULES = Object.keys(plugin.rules);

/**
 * Shapes that drew findings from this plugin across the corpus while having
 * nothing to do with PostgreSQL. Each one is a real false-positive pattern,
 * not a synthetic negative.
 */
const NON_POSTGRES_SOURCES: ReadonlyArray<readonly [string, string]> = [
  [
    'mongoose connect/release',
    `import mongoose from 'mongoose';
     async function main() {
       const client = await mongoose.connect(process.env.MONGO_URL);
       await client.query('SELECT * FROM cache WHERE id = ' + id);
     }`,
  ],
  [
    'redis client',
    `import { createClient } from 'redis';
     const client = createClient();
     await client.connect();
     await client.query('SELECT * FROM sessions');`,
  ],
  [
    'an HTTP API named like a database',
    `import { api } from './api';
     export async function search(term) {
       return api.query('SELECT * FROM products WHERE name = ' + term);
     }`,
  ],
  [
    'a MySQL project',
    `import mysql from 'mysql2/promise';
     const conn = await mysql.createConnection(url);
     await conn.query('SELECT * FROM users WHERE id = ' + id);`,
  ],
  [
    'a file with no database at all',
    `export function render(items) {
       return items.map((i) => \`<li>\${i.name}</li>\`).join('');
     }`,
  ],
  [
    'a local module merely named pg',
    `import { Pool } from './pg';
     const pool = new Pool();
     await pool.query('SELECT * FROM users WHERE id = ' + id);`,
  ],
];

const lint = (code: string, rule: string): Linter.LintMessage[] => {
  // The declared ESLint floor for this package is 8.40, where `new Linter()`
  // still defaults to eslintrc — a flat config would be ignored there and every
  // rule silently skipped, which is the vacuous pass this lock exists to catch.
  const linter = new Linter({ configType: "flat" });
  return linter.verify(
    code,
    {
      files: ['**/*.ts'],
      languageOptions: {
        parser: parser as unknown as Linter.Parser,
        parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      },
      plugins: { pg: plugin as unknown as Linter.Plugin },
      rules: { [`pg/${rule}`]: 'error' },
    },
    // Without a filename the Linter lints `<input>`, which matches no `files`
    // entry — so every rule is skipped and every negative below passes without
    // running any rule at all. The positive assertion at the bottom of this
    // file is what catches that; keep it.
    'query.ts',
  );
};

describe('PostgreSQL module gate', () => {
  it('the registry is non-empty, so the sweep below is not vacuous', () => {
    expect(RULES.length).toBeGreaterThan(0);
  });

  describe.each(NON_POSTGRES_SOURCES)('%s', (_name, code) => {
    it.each(RULES)('pg/%s reports nothing', (rule) => {
      const messages = lint(code, rule);
      // A parse or config error would also produce zero *rule* findings, so it
      // is asserted away rather than counted as a pass.
      expect(messages.filter((m) => !m.ruleId)).toHaveLength(0);
      expect(messages).toHaveLength(0);
    });
  });

  // The negatives above only prove the gate is closed; without this the whole
  // suite would still pass if the gate were closed on every file.
  it('the same query does report once the file imports pg', () => {
    const code = `import { Pool } from 'pg';
      client.query('SELECT * FROM users WHERE id = ' + id);`;
    expect(lint(code, 'no-unsafe-query').length).toBeGreaterThan(0);
  });

  it('and stays silent on that same query with the import removed', () => {
    const code = `client.query('SELECT * FROM users WHERE id = ' + id);`;
    expect(lint(code, 'no-unsafe-query')).toHaveLength(0);
  });
});
