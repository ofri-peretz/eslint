/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Tests for the PostgreSQL module gate.
 *
 * Every rule in this plugin abstains unless `fileUsesPostgres` says the file
 * has a PostgreSQL client, so a bug here is a bug in all thirteen at once —
 * silently, in whichever direction the bug leans.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '@typescript-eslint/parser';
import { fileUsesPostgres, PG_MODULES } from './index';

const uses = (code: string): boolean =>
  fileUsesPostgres(parse(code, { sourceType: 'module', range: true }));

describe('fileUsesPostgres', () => {
  describe('ESM imports', () => {
    it.each([
      ["import { Pool } from 'pg';", 'bare package'],
      ["import Client from 'pg/lib/client';", 'deep path'],
      ["import { sql } from '@vercel/postgres';", 'scoped package'],
      ["import x from '@vercel/postgres/edge';", 'scoped deep path'],
      ["import postgres from 'postgres';", 'postgres.js'],
      ["import { createPool } from 'slonik';", 'slonik'],
      ["import 'pg';", 'side-effect import with no specifiers'],
    ])('%s → true (%s)', (code) => {
      expect(uses(code)).toBe(true);
    });

    it.each([
      ["import { Pool } from 'mysql2';", 'a different driver'],
      ["import x from 'pgx';", 'a package merely sharing the prefix'],
      // A local file named after the package is not the package. Without this,
      // `./pg` would satisfy the gate in a repo that has no `pg` at all.
      ["import { Pool } from './pg';", 'relative specifier'],
      ["import { Pool } from '../db/pg';", 'relative parent specifier'],
      ["import { Pool } from '/pg';", 'absolute specifier'],
    ])('%s → false (%s)', (code) => {
      expect(uses(code)).toBe(false);
    });
  });

  describe('re-exports', () => {
    it('`export { Pool } from "pg"` counts', () => {
      expect(uses("export { Pool } from 'pg';")).toBe(true);
    });

    it('`export * from "pg"` counts', () => {
      expect(uses("export * from 'pg';")).toBe(true);
    });

    it('a re-export of something else does not', () => {
      expect(uses("export * from './helpers';")).toBe(false);
    });

    it('a local export with no source does not', () => {
      expect(uses('export const x = 1;')).toBe(false);
    });
  });

  describe('CommonJS requires', () => {
    it('top-level require counts', () => {
      expect(uses("const { Pool } = require('pg');")).toBe(true);
    });

    // `require` can sit anywhere, which is why the gate walks the whole tree
    // rather than only the top-level statements.
    it('require inside a function counts', () => {
      expect(uses('function f() { return require("pg"); }')).toBe(true);
    });

    it('require inside a conditional branch counts', () => {
      expect(uses('if (x) { require("pg"); }')).toBe(true);
    });

    it.each([
      ["require('mysql2');", 'a different driver'],
      ["require('./pg');", 'a relative path'],
      ['require(name);', 'a non-literal specifier'],
      ['require();', 'no arguments at all'],
      ['require(123);', 'a non-string literal'],
      ['notRequire("pg");', 'a differently named function'],
      ['obj.require("pg");', 'a member call, not the global require'],
    ])('%s → false (%s)', (code) => {
      expect(uses(code)).toBe(false);
    });
  });

  describe('connection strings', () => {
    // A config module holding the DSN but importing no driver is exactly where
    // no-hardcoded-credentials earns its keep, so the DSN is evidence by itself.
    it.each([
      "const url = 'postgres://user:pw@host/db';",
      "const url = 'postgresql://user:pw@host/db';",
      'const url = `postgres://user:pw@host/db`;',
      'const url = `postgresql://${user}@host/db`;',
    ])('%s → true', (code) => {
      expect(uses(code)).toBe(true);
    });

    it.each([
      "const url = 'mysql://user:pw@host/db';",
      "const url = 'https://example.test/postgres';",
      'const url = `mysql://${user}@host/db`;',
      'const n = 5;',
      'const t = ``;',
    ])('%s → false', (code) => {
      expect(uses(code)).toBe(false);
    });
  });

  describe('files with no PostgreSQL at all', () => {
    it('an empty file', () => {
      expect(uses('')).toBe(false);
    });

    // The shapes that produced the plugin's false positives: generic method
    // names on receivers that have nothing to do with PostgreSQL.
    it.each([
      'await mongoose.connect(uri);',
      'const rows = await api.query(userInput);',
      'redis.connect();',
      'const all = await Promise.all(tasks);',
    ])('%s stays outside the gate', (code) => {
      expect(uses(code)).toBe(false);
    });
  });

  it('every declared module is recognised as itself', () => {
    for (const mod of PG_MODULES) {
      expect(uses(`import x from '${mod}';`)).toBe(true);
    }
  });
});
