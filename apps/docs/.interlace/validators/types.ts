/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * Shared validator types.
 *
 * Validators are plain async functions that scan content (MDX, meta.json) and
 * return findings. They never throw on per-file issues — they collect.
 *
 * The consumer's test calls a validator and asserts the findings array is
 * empty (or matches expected exceptions).
 */

export interface ValidationFinding {
  /** Path to the file relative to contentDir */
  file: string;
  /** Optional line number where the issue is */
  line?: number;
  /** Human-readable description of the issue */
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidatorOptions {
  /** Absolute path to the docs content root (contains MDX + meta.json) */
  contentDir: string;
  /** Optional: skip files matching these glob/regex strings */
  ignore?: string[];
}
