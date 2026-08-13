/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Split an identifier into its words: `encryptionKey` → `['encryption','key']`,
 * `api_key` → `['api','key']`, `IVBytes` → `['iv','bytes']`.
 *
 * Short security words have to be matched as WORDS, not substrings. As plain
 * substrings `/iv/i` matches `div`, `private`, `receiver` and `derived`;
 * `/pin/i` matches `spinner` and `mapping`; `/key/i` matches `keyboard` and
 * `monkey`; `/cert/i` matches `certainty`; `/auth/i` matches `author`. That is
 * the substring trap that cost `no-timing-unsafe-compare` 88 findings.
 *
 * A regex boundary cannot do this job here, because the natural spelling —
 * `cert(?![a-z])` — stops working the moment the pattern is compiled
 * case-insensitively: `[a-z]` then matches the `F` of `certFingerprint` too,
 * and the guard rejects the name it was written to accept. Splitting first and
 * comparing whole words has no such failure mode.
 */
export function identifierWords(name: string): string[] {
  return name
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
}

/**
 * Build a name test from a list of security words.
 *
 * A listed name matches as a whole WORD of the identifier (`sign` matches
 * `signRequest`, not `design`), and additionally as a substring of the
 * separator-stripped identifier when it is long enough to be unambiguous
 * (`apikey` matches `apiKey`; `key` alone never substring-matches, so
 * `monkeyPatch` and `fileKey` stay out).
 */
export function makeNameTest(names: readonly string[]): (name: string) => boolean {
  const wanted = new Set(names.map((entry) => entry.toLowerCase()));
  const substrings = [...wanted].filter((entry) => entry.length >= 6);
  return (name: string) => {
    const words = identifierWords(name);
    if (words.some((word) => wanted.has(word))) return true;
    const joined = words.join('');
    return substrings.some((entry) => joined.includes(entry));
  };
}
