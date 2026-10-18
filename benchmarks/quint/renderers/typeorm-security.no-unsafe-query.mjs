// Renders one state of models/typeorm-security.no-unsafe-query.qnt into a program.
// The renderer only spells the shape; the verdict comes from the model.
import { renderValues } from './_sql.mjs';

export const plugin = 'typeorm-security';
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
    "import { DataSource } from 'typeorm';\nconst dataSource = new DataSource({ type: 'postgres' });",
  escape: (e) => `dataSource.driver.escape(${e})`,
  sinks: {
    DataSourceQuery: {
      kind: 'statement',
      call: (q) => `dataSource.query(${q})`,
    },
    ManagerQuery: {
      kind: 'statement',
      call: (q) => `dataSource.manager.query(${q})`,
    },
    QbWhere: {
      kind: 'fragment',
      call: (q) =>
        `dataSource.createQueryBuilder().select('u').from('users', 'u').where(${q}).getMany()`,
    },
  },
};

/** @param {Record<string, string>} c one case: dimension -> variant */
export const render = (c) => renderValues(SPEC, c);
