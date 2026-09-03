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
      // A TAGGED template whose escape has no cooked value: null as of
      // @typescript-eslint 8.68.0, the raw text under 8.54.0. Reading only
      // `cooked` loses the DSN and the whole module gate closes.
      'const url = String.raw`postgres://user:pw@host/db \\x`;',
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

  describe('a locally bound `require` is not module loading', () => {
    // The plugin's own lesson turned on itself: a *name* is not proof of an
    // *interface*. Without this, the gate opened every rule on a file with no
    // PostgreSQL in it at all.
    it.each([
      "function f(require) { require('pg'); }",
      "const load = (require) => require('pg');",
      "const require = (m) => m; require('pg');",
      "let require; require('pg');",
    ])('%s → false', (code) => {
      expect(uses(code)).toBe(false);
    });

    // The regression a file-wide flag caused: a real `require('pg')` at module
    // scope must survive an unrelated inner binding. Silencing all thirteen rules
    // there trades a false positive for a false negative — the worse of the two.
    it('an unshadowed require survives a shadowing binding elsewhere', () => {
      expect(uses("const c = require('pg');\nfunction wrapper(require) {}")).toBe(true);
      expect(uses("function wrapper(require) {}\nconst c = require('pg');")).toBe(true);
      expect(
        uses("function outer() { const c = require('pg'); }\nfunction w(require) {}"),
      ).toBe(true);
    });

    it('shadowing applies only inside the scope that binds it', () => {
      expect(uses("function f(require) { require('pg'); }")).toBe(false);
      expect(uses("{ const require = (m) => m; require('pg'); }")).toBe(false);
    });

    it('the other arms still apply when `require` is shadowed', () => {
      expect(uses("import { Pool } from 'pg';\nfunction f(require) { require('pg'); }")).toBe(true);
      expect(uses("const url = 'postgres://h/db';\nfunction f(require) { require('pg'); }")).toBe(true);
    });
  });

  it('the result is cached per Program, so thirteen rules cost one scan', () => {
    const ast = parse("import { Pool } from 'pg';", { sourceType: 'module', range: true });
    expect(fileUsesPostgres(ast)).toBe(true);
    expect(fileUsesPostgres(ast)).toBe(true);
  });
});
