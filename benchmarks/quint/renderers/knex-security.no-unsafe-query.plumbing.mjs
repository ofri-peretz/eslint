// Renders one state of models/knex-security.no-unsafe-query.plumbing.qnt into a
// program. The renderer only spells the shape; the verdict comes from the model.
import { renderPlumbing } from './_sql.mjs';

export const plugin = 'knex-security';
export const rule = 'no-unsafe-query';
export const dimensions = [
  'importStyle',
  'call',
  'receiver',
  'source',
  'position',
];

const SPEC = {
  module: 'knex',
  factory: 'knex',
  construct: (ref) => `${ref}({ client: 'pg' })`,
  method: 'raw',
  kind: 'statement',
};

/** @param {Record<string, string>} c one case: dimension -> variant */
export const render = (c) => renderPlumbing(SPEC, c);
