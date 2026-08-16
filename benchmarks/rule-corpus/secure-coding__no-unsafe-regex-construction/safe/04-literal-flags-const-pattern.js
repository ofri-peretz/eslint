/**
 * SAFE - A module constant compiled with LITERAL flags. Both operands are fixed
 * at parse time.
 */
const TABLE_NAME_PATTERN = '^[A-Za-z_][A-Za-z0-9_]{0,62}$';

export function assertTableName(name) {
  if (!new RegExp(TABLE_NAME_PATTERN, 'u').test(name)) {
    throw new Error(`invalid table name: ${name}`);
  }
}
