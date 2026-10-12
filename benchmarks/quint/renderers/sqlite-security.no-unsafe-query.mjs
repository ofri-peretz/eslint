// Renders one state of models/sqlite-security.no-unsafe-query.qnt into a program.
// The renderer only spells the shape; the verdict comes from the model.
import { renderValues } from './_sql.mjs';

export const plugin = 'sqlite-security';
export const rule = 'no-unsafe-query';
export const dimensions = [
  'source',
  'transform',
  'position',
  'binding',
  'sink',
];

const SPEC = {
  setup: '',
  sinks: {
    BetterPrepare: {
      kind: 'statement',
      setup:
        "import Database from 'better-sqlite3';\nconst db = new Database(':memory:');",
      call: (q) => `db.prepare(${q}).all()`,
    },
    Sqlite3All: {
      kind: 'statement',
      setup:
        "import sqlite3 from 'sqlite3';\nconst db = new sqlite3.Database(':memory:');",
      call: (q) => `db.all(${q})`,
    },
    NodeSqliteExec: {
      kind: 'statement',
      setup:
        "import { DatabaseSync } from 'node:sqlite';\nconst db = new DatabaseSync(':memory:');",
      call: (q) => `db.exec(${q})`,
    },
  },
};

/** @param {Record<string, string>} c one case: dimension -> variant */
export const render = (c) => renderValues(SPEC, c);
