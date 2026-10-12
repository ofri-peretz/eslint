// Renders one state of models/sqlite-security.no-unsafe-query.plumbing.qnt into a
// program. The renderer only spells the shape; the verdict comes from the model.
import { renderPlumbing } from './_sql.mjs';

export const plugin = 'sqlite-security';
export const rule = 'no-unsafe-query';
export const dimensions = [
  'importStyle',
  'call',
  'receiver',
  'source',
  'position',
];

const SPEC = {
  module: 'node:sqlite',
  factory: 'DatabaseSync',
  construct: (ref) => `new ${ref}(':memory:')`,
  method: 'exec',
  kind: 'statement',
};

/** @param {Record<string, string>} c one case: dimension -> variant */
export const render = (c) => renderPlumbing(SPEC, c);
