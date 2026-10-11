/**
 * The relative-module arm of the PostgreSQL gate, on real files.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import type { TSESTree } from '@interlace/eslint-devkit';
import { usesPostgres } from './index';

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-gate-'));
afterAll(() => fs.rmSync(ROOT, { recursive: true, force: true }));

function project(name: string, entries: Record<string, string>): string {
  const dir = path.join(ROOT, name);
  for (const [file, text] of Object.entries(entries)) {
    const target = path.join(dir, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
  }
  return dir;
}

function context(file: string, code: string) {
  const { ast, scopeManager } = parser.parseForESLint(code, {
    filePath: file,
    sourceType: 'module',
    range: true,
    loc: true,
  });
  return {
    physicalFilename: file,
    languageOptions: { parser },
    sourceCode: {
      ast: ast as TSESTree.Program,
      getScope: () => scopeManager!.globalScope!,
    },
  } as unknown as Parameters<typeof usesPostgres>[0];
}

describe('usesPostgres — evidence one relative import away', () => {
  const app = project('app', {
    'db.ts': "import { Pool } from 'pg';\nexport const pool = new Pool();\n",
    'mongo.ts': "import mongoose from 'mongoose';\nexport default mongoose;\n",
    'bad.json': '{ broken',
    'h1.ts': "export * from './h2';\n",
    'h2.ts': "export * from './h3';\n",
    'h3.ts': "export * from './h4';\n",
    'h4.ts': "export * from './h5';\n",
    'h5.ts': "import { Pool } from 'pg';\nexport const pool = new Pool();\n",
    'loop-a.ts': "export * from './loop-b';\n",
    'loop-b.ts': "export * from './loop-a';\n",
  });
  const route = path.join(app, 'routes/r.ts');

  it('opens through a dynamic import() and an import-equals require', () => {
    expect(
      usesPostgres(context(route, "const db = await import('../db');")),
    ).toBe(true);
    expect(usesPostgres(context(route, "import db = require('../db');"))).toBe(
      true,
    );
    expect(usesPostgres(context(route, "const db = require('../db');"))).toBe(
      true,
    );
  });

  it('stays closed for non-literal loads, other drivers, unreadable files and long or circular chains', () => {
    expect(usesPostgres(context(route, 'const db = await import(name);'))).toBe(
      false,
    );
    expect(usesPostgres(context(route, "import db from '../mongo';"))).toBe(
      false,
    );
    expect(usesPostgres(context(route, "import cfg from '../bad.json';"))).toBe(
      false,
    );
    expect(usesPostgres(context(route, "import { pool } from '../h1';"))).toBe(
      false,
    );
    expect(
      usesPostgres(context(route, "import { pool } from '../loop-a';")),
    ).toBe(false);
    expect(usesPostgres(context(route, "import { pool } from '../h3';"))).toBe(
      true,
    );
  });

  it('answers a second rule from the per-file cache', () => {
    const shared = context(route, "import { pool } from '../db';");
    expect(usesPostgres(shared)).toBe(true);
    expect(usesPostgres(shared)).toBe(true);
    const closed = context(route, "import db from '../mongo';");
    expect(usesPostgres(closed)).toBe(false);
    expect(usesPostgres(closed)).toBe(false);
  });
});
