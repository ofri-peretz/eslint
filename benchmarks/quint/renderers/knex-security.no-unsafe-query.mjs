// Renders one state of models/knex-security.no-unsafe-query.qnt into a program.
// The renderer only spells the shape; the verdict comes from the model.
import { renderValues } from './_sql.mjs';

export const plugin = 'knex-security';
export const rule = 'no-unsafe-query';
export const dimensions = [
  'source',
  'transform',
  'position',
  'binding',
  'sink',
];

const SPEC = {
  setup: "import knex from 'knex';\nconst db = knex({ client: 'pg' });",
  sinks: {
    Raw: { kind: 'statement', call: (q) => `db.raw(${q})` },
    WhereRaw: { kind: 'fragment', call: (q) => `db('users').whereRaw(${q})` },
    HavingRaw: {
      kind: 'fragment',
      call: (q) => `db('users').groupBy('id').havingRaw(${q})`,
    },
  },
};

/** @param {Record<string, string>} c one case: dimension -> variant */
export const render = (c) => renderValues(SPEC, c);
