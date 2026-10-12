// Renders one state of models/mysql-security.no-unsafe-query.qnt into a program.
// The renderer only spells the shape; the verdict comes from the model.
import { renderValues } from './_sql.mjs';

export const plugin = 'mysql-security';
export const rule = 'no-unsafe-query';
export const dimensions = [
  'source',
  'transform',
  'position',
  'binding',
  'sink',
];

const SPEC = {
  setup: "import mysql from 'mysql2/promise';",
  escape: (e) => `mysql.escape(${e})`,
  sinks: {
    PoolQuery: {
      kind: 'statement',
      setup: 'const pool = mysql.createPool({});',
      call: (q) => `pool.query(${q})`,
    },
    ConnExecute: {
      kind: 'statement',
      setup: 'const conn = await mysql.createConnection({});',
      call: (q) => `conn.execute(${q})`,
    },
    QueryOptions: {
      kind: 'statement',
      setup: 'const pool = mysql.createPool({});',
      call: (q) => `pool.query({ sql: ${q} })`,
    },
  },
};

/** @param {Record<string, string>} c one case: dimension -> variant */
export const render = (c) => renderValues(SPEC, c);
