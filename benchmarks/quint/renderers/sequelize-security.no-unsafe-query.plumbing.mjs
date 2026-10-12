// Renders one state of models/sequelize-security.no-unsafe-query.plumbing.qnt into a
// program. The renderer only spells the shape; the verdict comes from the model.
import { renderPlumbing } from './_sql.mjs';

export const plugin = 'sequelize-security';
export const rule = 'no-unsafe-query';
export const dimensions = [
  'importStyle',
  'call',
  'receiver',
  'source',
  'position',
];

const SPEC = {
  module: 'sequelize',
  factory: 'Sequelize',
  construct: (ref) => `new ${ref}('sqlite::memory:')`,
  method: 'query',
  kind: 'statement',
};

/** @param {Record<string, string>} c one case: dimension -> variant */
export const render = (c) => renderPlumbing(SPEC, c);
