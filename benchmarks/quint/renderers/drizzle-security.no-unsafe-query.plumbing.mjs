// Renders one state of models/drizzle-security.no-unsafe-query.plumbing.qnt into a
// program. The renderer only spells the shape; the verdict comes from the model.
import { renderPlumbing } from './_sql.mjs';

export const plugin = 'drizzle-security';
export const rule = 'no-unsafe-query';
export const dimensions = [
  'importStyle',
  'call',
  'receiver',
  'source',
  'position',
];

const SPEC = {
  module: 'drizzle-orm/node-postgres',
  factory: 'drizzle',
  construct: (ref) => `${ref}({})`,
  method: 'execute',
  kind: 'statement',
};

/** @param {Record<string, string>} c one case: dimension -> variant */
export const render = (c) => renderPlumbing(SPEC, c);
