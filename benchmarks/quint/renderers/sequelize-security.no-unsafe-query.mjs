// Renders one state of models/sequelize-security.no-unsafe-query.qnt into a program.
// The renderer only spells the shape; the verdict comes from the model.
import { renderValues } from './_sql.mjs';

export const plugin = 'sequelize-security';
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
    "import { Sequelize, Model } from 'sequelize';\nconst sequelize = new Sequelize('sqlite::memory:');\nclass User extends Model {}",
  escape: (e) => `sequelize.escape(${e})`,
  sinks: {
    Query: { kind: 'statement', call: (q) => `sequelize.query(${q})` },
    LiteralWhere: {
      kind: 'fragment',
      call: (q) => `User.findAll({ where: Sequelize.literal(${q}) })`,
    },
  },
};

/** @param {Record<string, string>} c one case: dimension -> variant */
export const render = (c) => renderValues(SPEC, c);
