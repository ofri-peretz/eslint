/**
 * SAFE - The vocabulary appears only in a comment and a string literal. A
 * report here would prove the check reads printed source rather than the AST.
 *
 * createCipheriv('aes-256-cbc', key, '0123456789abcdef')
 */
const MIGRATION_NOTE =
  "rows before v4 used createCipheriv with the static IV '0123456789abcdef'";

export function describeMigration() {
  return { note: MIGRATION_NOTE, iv: '0123456789abcdef' };
}
