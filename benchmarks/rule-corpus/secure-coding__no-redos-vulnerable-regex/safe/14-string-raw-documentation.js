/**
 * SAFE (adversarial) - `String.raw` used for what it is normally used for:
 * writing backslash-heavy documentation text. The catastrophic shape appears
 * inside it and inside a comment. Neither is compiled.
 *
 * See the deny-list entry for (\w+\s*)+ and ([a-z]{2,4})+ below.
 */
export const MIGRATION_NOTE = String.raw`Replace ^(\w+\s*)+$ with ^\w+(?: \w+)*$ before upgrading.`;

// The shape ^([a-zA-Z0-9]{2,4})+$ is the one that slipped past the old analyser.
export function migrationNote() {
  return MIGRATION_NOTE;
}
