/**
 * SAFE - Every dangerous spelling this rule looks for appears here, but only
 * inside comments and string literals. Nothing is compiled, assigned to
 * innerHTML, or handed to a sanitizer.
 *
 * A report here proves the check reads printed source rather than AST
 * structure. The strings below are documentation copy and a lint-rule name,
 * not code.
 */
const MIGRATION_NOTES = [
  'Replaced Handlebars.compile with a precompiled bundle in v4.',
  'innerHTML assignments were migrated to textContent.',
  'dangerouslySetInnerHTML is banned by react/no-danger.',
  'DOMPurify.sanitize ADD_TAGS overrides were removed.',
];

// _.template and Handlebars.compile are no longer used anywhere in this file.
function describeMigration() {
  return MIGRATION_NOTES.join('\n');
}

module.exports = { describeMigration, MIGRATION_NOTES };
