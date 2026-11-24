/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace lock — truepass runs on this repo's tests.
 *
 * truepass reports the ways a suite reports green without the code passing: a
 * focused test, a skip with no reason, a fixed sleep, a retry (its ESLint
 * rules), and an assertion moved to a weaker matcher or a snapshot rewritten
 * with no reason (`truepass diff`). It is wired in four places, and deleting
 * any one of them leaves every other file, and every test, passing:
 *
 *   - `eslint.config.mjs` spreads `truepass.recommended` over the test files;
 *   - `eslint-suppressions.json` holds the findings that predate it, and only
 *     those — a suppressions file is a blanket, and one that held another
 *     rule's findings would hide them behind this adoption;
 *   - `npm run lint:truepass` runs it, from the Dogfood job in quality.yml;
 *   - pre-push runs `truepass diff --base origin/main`.
 *
 * @provenBy {"file":"eslint.config.mjs","find":"    ...truepass.recommended,\n","replace":""}
 * @provenBy {"file":".github/workflows/quality.yml","find":"      - run: npm run lint:truepass\n","replace":""}
 * @provenBy {"file":"lefthook.yml","find":"npx truepass diff --base origin/main","replace":"true"}
 * @provenBy {"file":"package.json","find":"\"lint:truepass\": \"eslint --config eslint.config.mjs","replace":"\"lint:truepass\": \"true"}
 */

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../..');
const read = (file: string): string => readFileSync(join(ROOT, file), 'utf8');

type Suppressions = Record<string, Record<string, { count: number }>>;

describe('truepass is wired into this repo', () => {
  it('the root ESLint config turns on truepass.recommended over test files', () => {
    const config = read('eslint.config.mjs');
    expect(config).toContain(
      "import { configs as truepass } from 'truepass/eslint';",
    );
    expect(config).toMatch(
      /\.\.\.truepass\.recommended,\s*\n\s*files: \[\s*\n\s*'\*\*\/\*\.\{test,spec\}\./,
    );
  });

  it('truepass is a root devDependency at 1.x or later', () => {
    const pkg = JSON.parse(read('package.json')) as {
      devDependencies: Record<string, string>;
    };
    expect(pkg.devDependencies['truepass']).toMatch(/^\^[1-9]\d*\./);
  });

  it('the suppressions file holds truepass findings only', () => {
    const suppressions = JSON.parse(
      read('eslint-suppressions.json'),
    ) as Suppressions;
    const rules = new Set(
      Object.values(suppressions).flatMap((byRule) => Object.keys(byRule)),
    );
    expect(rules.size).toBeGreaterThan(0);
    expect([...rules].filter((rule) => !rule.startsWith('truepass/'))).toEqual(
      [],
    );
  });

  it('CI lints the test files with the root config, at zero warnings', () => {
    const scripts = (
      JSON.parse(read('package.json')) as { scripts: Record<string, string> }
    ).scripts;
    const lint = scripts['lint:truepass'] ?? '';
    expect(lint).toMatch(/^eslint --config eslint\.config\.mjs /);
    expect(lint).toContain('--max-warnings 0');
    expect(lint).toContain(
      "'**/*.{test,spec}.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'",
    );
    // `--pass-on-unpruned-suppressions` would let a fixed finding keep its
    // suppression, and the ratchet would stop going down.
    expect(lint).not.toContain('--pass-on-unpruned-suppressions');
    expect(read('.github/workflows/quality.yml')).toContain(
      '      - run: npm run lint:truepass\n',
    );
  });

  it('pre-push runs truepass diff against origin/main', () => {
    const prePush = read('lefthook.yml').split(/^pre-push:/m)[1] ?? '';
    expect(prePush).toMatch(
      /^ {4}truepass-diff:\n(?: {6}#.*\n)*\s+run: .*npx truepass diff --base origin\/main$/m,
    );
  });
});
