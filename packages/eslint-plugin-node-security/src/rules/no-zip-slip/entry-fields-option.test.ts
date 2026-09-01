/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The archive-entry field name is the library's, and the library is the
 * consumer's.
 *
 * `entryName` is adm-zip, `fileName` is yauzl, `path` is unzipper and tar. This
 * rule hard-coded seven guesses until 2026-08-26 while ALREADY letting the
 * consumer configure `archiveModules` — so it accepted that it could not know
 * which libraries a project uses, and simultaneously asserted it knew what
 * their entries are called.
 *
 * `archiveEntryFields` REPLACES the default, because a default that cannot be
 * removed is still an assertion about somebody else's dependency list.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe as suite, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';

import { noZipSlip } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = suite;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

const ADM = `import AdmZip from 'adm-zip';\nimport path from 'node:path';\n`;

suite('no-zip-slip — the entry field is the library’s, not ours', () => {
  ruleTester.run('archiveEntryFields', noZipSlip, {
    valid: [
      {
        // A consumer who narrows the vocabulary to their one library stops
        // hearing about fields no archive in their tree exposes.
        name: 'a field the consumer removed from the vocabulary',
        code: `${ADM}function f(zip, dest) { for (const e of zip.getEntries()) { path.join(dest, e.fileName); } }`,
        options: [{ archiveEntryFields: ['entryName'] }],
      },
      {
        name: 'an empty vocabulary reports no entry shape at all',
        code: `${ADM}function f(zip, dest) { for (const e of zip.getEntries()) { path.join(dest, e.entryName); } }`,
        options: [{ archiveEntryFields: [] }],
      },
    ],
    invalid: [
      {
        name: 'the default vocabulary still covers adm-zip',
        code: `${ADM}function f(zip, dest) { for (const e of zip.getEntries()) { path.join(dest, e.entryName); } }`,
        errors: 1,
      },
      {
        // The point of the option: a library whose field name nobody here has
        // heard of is now reachable.
        name: 'a field name the hard-coded list never knew',
        code: `${ADM}function f(zip, dest) { for (const e of zip.getEntries()) { path.join(dest, e.archivedAs); } }`,
        options: [{ archiveEntryFields: ['archivedAs'] }],
        errors: 1,
      },
    ],
  });
});
