/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `namesACredential` read the WRITTEN CONTENT of a template literal as if it
 * were the name of what is being stored. A test stub writing a fake CLI's
 * JSON output — `{"usage":{"input_tokens":10,"output_tokens":5}}` — contains
 * the credential word "token" incidentally, inside prose that is printed, not
 * stored. Fixed by requiring a NAME to be a single token: no identifier, key
 * or path segment contains whitespace, so a multi-word or multi-line string
 * is content, never a name.
 *
 * github.com/ofri-peretz/eslint issue #1548.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireStorageEncryption } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run(
  'require-storage-encryption — written content is not a name',
  requireStorageEncryption,
  {
    valid: [
      {
        // @found github.com/ofri-peretz/eslint issue #1548
        name: 'FP: a shell stub written to disk whose JSON output happens to say "input_tokens"',
        code: `import { writeFileSync } from 'node:fs';
export const stub = (bin) =>
  writeFileSync(bin, \`#!/bin/sh\nprintf '{"usage":{"input_tokens":10,"output_tokens":5}}'\n\`);`,
      },
      {
        name: 'a multi-line config file whose prose mentions a credential tail word',
        code: `fs.writeFileSync('app.conf', 'refresh the api token every hour\\nvia the rotation job');`,
      },
    ],
    invalid: [
      {
        // POSITIVE CONTROL: the identical credential word, as a real single-token
        // name rather than embedded in prose, still reports.
        name: 'the same word as a bare key still reports',
        code: "fs.writeFileSync('creds.json', password);",
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  },
);
