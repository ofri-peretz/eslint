// Renders one state of models/drizzle-security.no-unsafe-query.qnt into a program.
// The renderer only spells the shape; the verdict comes from the model.
import { renderValues } from './_sql.mjs';

export const plugin = 'drizzle-security';
export const rule = 'no-unsafe-query';
export const dimensions = [
  'source',
  'transform',
  'position',
  'binding',
  'sink',
];

const SPEC = {
  setup:
    "import { sql } from 'drizzle-orm';\nimport { drizzle } from 'drizzle-orm/node-postgres';\nconst db = drizzle({});",
  sinks: {
    SqlRaw: { kind: 'statement', call: (q) => `db.execute(sql.raw(${q}))` },
    ExecuteString: { kind: 'statement', call: (q) => `db.execute(${q})` },
    TaggedSql: {
      kind: 'statement',
      tagged: true,
      call: (q) => `db.execute(sql${q})`,
    },
  },
};

/** @param {Record<string, string>} c one case: dimension -> variant */
export const render = (c) => renderValues(SPEC, c);
