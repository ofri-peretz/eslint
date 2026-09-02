/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Inline failure reporters must not use unescaped backtick-pairs inside
 * double-quoted bash string arguments.
 *
 * In bash, backticks inside double-quoted strings trigger command substitution,
 * not markdown code formatting. When the "command" doesn't exist, it returns
 * empty — leaving gaps in the printed text.
 *
 * Observed in peer-health.yml and resource-profile.yml (issues #784, #802).
 * The body printed "is now stale. Those numbers back ." with the backtick-
 * delimited code paths silently replaced by empty strings:
 *
 *   # BUG: double-quoted string — `cmd` runs as a command, returns ""
 *   BODY=$(printf '%s\n' "failed: so `path.json` is stale")
 *   # → "failed: so  is stale"
 *
 *   # GOOD: single-quoted string — backticks are always literal
 *   BODY=$(printf '%s\n' 'failed: so `path.json` is stale')
 *   # → "failed: so `path.json` is stale"
 *
 *   # ALSO GOOD: escaped backticks in double-quoted string
 *   BODY=$(printf '%s\n' "failed: so \`path.json\` is stale")
 *   # → "failed: so `path.json` is stale"
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const WORKFLOWS = join(ROOT, '.github', 'workflows');

describe('workflow run blocks must not have unescaped backtick-pairs inside double-quoted strings', () => {
  const files = readdirSync(WORKFLOWS).filter((f) => f.endsWith('.yml'));

  it.each(files)('%s', (file) => {
    const src = readFileSync(join(WORKFLOWS, file), 'utf8');

    const offenders = src
      .split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) =>
        // Match a double-quoted string that contains an unescaped backtick pair.
        // The negative lookbehind (?<!\\) distinguishes unescaped ` from \\`.
        // Escaped backticks (\\`) are legitimate markdown code formatting in echo
        // statements and are intentionally excluded.
        /"[^"]*(?<!\\)`[^`]*(?<!\\)`[^"]*"/.test(line),
      )
      .map(({ line, n }) => `line ${n}: ${line.trim()}`);

    expect(
      offenders,
      `${file}: double-quoted strings containing unescaped backtick-pairs ` +
        `trigger bash command substitution, not code formatting. ` +
        `The substituted "command" does not exist, returns empty, and the ` +
        `message prints with silent gaps. ` +
        "Use single quotes for the body string ('text `path` text') " +
        'or escape the backticks ("text \\`path\\` text").',
    ).toEqual([]);
  });
});
