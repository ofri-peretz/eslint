// import-next/consistent-type-specifier-style — true positive
// @origin       hand-written
// @caution      With no options the rule is `prefer-top-level`, as in eslint-plugin-import
//               (default changed in the drop-in parity fix). An inline `type` specifier is
//               the finding. This file is also what keeps the rule measured by the corpus
//               coverage gate: it used to fire on a top-level `import type`, by accident.
// This MUST be flagged by import-next/consistent-type-specifier-style
import { type Shape } from './m';
export const area = (s: Shape): number => s.width * s.height;
