/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A defect this rule found in code somebody else shipped.
 *
 * yauzl validates entry NAMES. Nothing validated the link TARGET, so an
 * archive could plant a symlink pointing anywhere and a later entry could
 * write through it. Verified by building malicious zips against the real
 * package: of everything tried, only this path escaped the extraction root.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noZipSlip } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

describe('no-zip-slip — found in the wild', () => {
  ruleTester.run('wild', noZipSlip, {
    valid: [],
    invalid: [
      {
        // @source nwutils/getter src/decompress.js:100
        filename: 'src/decompress.js',
        name: 'a symlink whose target comes from the archive bytes',
        code: `
          const yauzl = require('yauzl');
          zipfile.on('entry', (entry) => {
            const entryPathAbs = path.join(destination, entry.fileName);
            zipfile.openReadStream(entry, (err, readStream) => {
              const linkTarget = readStream.read().toString('utf8');
              fs.symlink(linkTarget, entryPathAbs, () => zipfile.readEntry());
            });
          });
        `,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
    ],
  });
});
