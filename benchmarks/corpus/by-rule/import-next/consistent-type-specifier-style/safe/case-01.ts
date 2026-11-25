// import-next/consistent-type-specifier-style — true negative
// @origin       hand-written
// @caution      A top-level `import type` is the style the rule's default accepts.
// This MUST NOT be flagged by import-next/consistent-type-specifier-style
import type { Shape } from './m';
export const area = (s: Shape): number => s.width * s.height;
