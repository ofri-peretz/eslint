/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * read-baseline.ts — read a ratchet baseline, or an empty list if there is none.
 *
 * Every shrink-only gate in this repo starts the same way: read the committed
 * baseline, compare, refuse anything new. The obvious spelling —
 *
 *   fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE)) : []
 *
 * — is a check-then-use race (`js/file-system-race`): the file can be created,
 * replaced or deleted between the two calls, and on the delete branch the read
 * throws an unhandled ENOENT that reads to a maintainer as "the gate crashed",
 * not "the baseline vanished".
 *
 * Asking forgiveness closes it. There is only ONE filesystem call, so there is
 * no window between a question and an answer. A missing baseline means "no
 * debt recorded yet", which is exactly what `--update` bootstraps from.
 *
 * ENOENT is the only tolerated failure. A permissions error, a directory where
 * a file should be, or unparseable JSON still throws — a gate that read a
 * corrupt baseline as "empty" would silently re-permit every site in it.
 */
import * as fs from 'node:fs';

/**
 * The recorded entries under `key`, or `[]` when the baseline does not exist.
 *
 * @param file  path to the baseline JSON
 * @param key   the array property holding the entries (`sites`, `rules`, …)
 */
export function readBaseline(file: string, key: string): string[] {
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  return (JSON.parse(raw) as Record<string, string[]>)[key] ?? [];
}

/**
 * The recorded map under `key`, or `{}` when the baseline does not exist.
 *
 * The array form answers "is this entry known debt". Some ratchets need "how
 * MUCH debt does this entry carry" — a per-rule count that may shrink but
 * never grow — and a list of 14,935 identical strings is not that.
 */
export function readBaselineRecord(
  file: string,
  key: string,
): Record<string, number> {
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw error;
  }
  return (JSON.parse(raw) as Record<string, Record<string, number>>)[key] ?? {};
}

/**
 * The DATA entries of a FLAT artefact — one whose records sit at the top level
 * rather than nested under a key — with metadata skipped.
 *
 * `.agent/plugin-rule-manifest.json` keys plugins directly:
 *
 *   { "eslint-plugin-node-security": { "no-ssrf": {…} },  ← data
 *     "command": "npx tsx scripts/check-new-rule-cases.ts --update" }  ← metadata
 *
 * When `command` was added — required of every artefact by the
 * artefacts-name-their-method lock — three readers iterating `Object.entries`
 * read the string as a plugin and its CHARACTERS as rules, and reported
 * defects that do not exist:
 *
 *     ✗ 48 rule(s) with no case:  command/0  command/1  command/2 …
 *     ✗ 56 debt entries now covered:  command → n   command → p   command → x
 *
 * Both gates went red on a repository that was fine. A metadata field is a
 * string; a record is an object. That distinction is the whole fix, and it
 * belongs in one place rather than in every reader — three readers each
 * needing to remember the same exclusion is how the next one forgets.
 */
export function flatEntries<T>(parsed: unknown): Record<string, T> {
  if (typeof parsed !== 'object' || parsed === null) return {};
  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).filter(
      (pair): pair is [string, T] =>
        typeof pair[1] === 'object' && pair[1] !== null,
    ),
  );
}

/**
 * `flatEntries` over a file on disk. Separate from the pure form because one
 * caller reads the manifest out of git (`git show <ref>:<path>`) to compare a
 * branch against its merge base, and has no file to open.
 */
export function readFlatEntries<T>(file: string): Record<string, T> {
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw error;
  }
  return flatEntries<T>(JSON.parse(raw));
}
