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
