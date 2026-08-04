/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Token-aligned matching for sensitive identifier names.
 *
 * Substring matching is not usable here. `'shippingAddress'.includes('pin')`
 * and `'hashtags'.includes('hash')` are both true, and both are ordinary
 * fields — that produced four false positives on a single TypeORM entity.
 *
 * Instead an identifier is split into its camelCase / snake_case / kebab
 * tokens and a term matches only when the identifier *ends with* the term's
 * own token sequence:
 *
 *   password            → [password]              ends with [password]  ✔
 *   hashedPassword      → [hashed, password]      ends with [password]  ✔
 *   apiKey              → [api, key]              ends with [api, key]  ✔
 *   passwordChangedAt   → [password, changed, at] ends with [at]        ✘
 *   shippingAddress     → [shipping, address]                           ✘
 *
 * "Ends with" is the right anchor because English qualifiers precede the noun:
 * a `userPassword` is a password, a `passwordPolicy` is a policy.
 */

/** Split an identifier into lower-cased word tokens. */
export function tokenize(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+|\s+/)
    .filter(Boolean)
    .map((t) => t.toLowerCase());
}

/** Whether `tokens` ends with the `suffix` token sequence. */
function endsWithTokens(
  tokens: readonly string[],
  suffix: readonly string[],
): boolean {
  if (suffix.length === 0 || suffix.length > tokens.length) return false;
  const offset = tokens.length - suffix.length;
  return suffix.every((tok, i) => tokens[offset + i] === tok);
}

/**
 * Pre-tokenize a term list once, so per-identifier checks stay cheap.
 * Rules build this at `create()` time and reuse it for every member.
 */
export function compileSensitiveTerms(terms: readonly string[]): string[][] {
  return terms.map(tokenize).filter((t) => t.length > 0);
}

/** Whether an identifier names one of the compiled sensitive terms. */
export function isSensitiveName(
  name: string,
  compiledTerms: readonly string[][],
): boolean {
  const tokens = tokenize(name);
  return compiledTerms.some((term) => endsWithTokens(tokens, term));
}
