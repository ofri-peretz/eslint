/**
 * VULNERABLE - `lodahs` (transposed `sh` -> `hs`) loaded through TypeScript's
 * `import x = require(...)` form, which is what a CommonJS-targeting TS
 * codebase writes when the dependency has no default export.
 */
import lodahs = require('lodahs');

export interface AuditRow {
  actor: string;
  action: string;
}

export function groupByActor(rows: AuditRow[]): Record<string, AuditRow[]> {
  return lodahs.groupBy(rows, (row: AuditRow) => row.actor);
}
