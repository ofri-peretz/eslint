/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace lock — every script the root `package.json` runs, and every script
 * `scripts/README.md` lists, is a file that exists.
 *
 * The bug: `npm run scaffold:mcp` and `npm run ilb:mcp-test` pointed at
 * `scripts/*.ts` files deleted long before, so both commands failed for anyone
 * who ran them. The README listed 35 scripts by their old `.mjs` names after
 * the move to `.ts`. Nothing compared either list with the directory.
 *
 * @provenBy {"file":"package.json","find":"\"tsx scripts/ilb-corpus-integrity.ts\"","replace":"\"tsx scripts/ilb-corpus-integrity.mjs\""}
 * @provenBy {"file":"scripts/README.md","find":"| `ilb-corpus-integrity.ts` |","replace":"| `ilb-corpus-integrity.mjs` |"}
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');

describe('script references exist', () => {
  it('every `tsx|node <file>` in the root package.json scripts exists', () => {
    const { scripts } = JSON.parse(
      readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    const missing = Object.entries(scripts).flatMap(([name, command]) =>
      [...command.matchAll(/\b(?:tsx|node)\s+((?:scripts|tools)\/[^\s;&|]+)/g)]
        .map((m) => m[1])
        .filter((file) => !existsSync(join(REPO_ROOT, file)))
        .map((file) => `${name} -> ${file}`),
    );
    expect(missing).toEqual([]);
  });

  it('every script scripts/README.md lists exists', () => {
    const readme = readFileSync(join(REPO_ROOT, 'scripts/README.md'), 'utf8');
    const listed = [...readme.matchAll(/^\| `([^`]+\.[cm]?[jt]s)`/gm)].map(
      (m) => m[1],
    );
    expect(listed.length).toBeGreaterThan(0);
    expect(
      listed.filter((file) => !existsSync(join(REPO_ROOT, 'scripts', file))),
    ).toEqual([]);
  });
});
