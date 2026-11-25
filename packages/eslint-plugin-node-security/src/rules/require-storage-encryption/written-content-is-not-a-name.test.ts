/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The text a call WRITES is not evidence of what is written (#1548).
 *
 * Name evidence comes from names: an identifier, a storage key, a file path.
 * A string literal or template that holds whitespace, quotes or braces is
 * content — a shell stub, a JSON body, a sentence — and the word `token` or
 * `password` somewhere inside it says nothing about the value being a
 * credential. Before the fix the joined template text was the "name", so a
 * test writing a fake CLI that prints `input_tokens` was a credential on disk.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireStorageEncryption } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'require-storage-encryption — written content is not a name',
  requireStorageEncryption,
  {
    valid: [
      {
        // @found ofri-peretz/burgee 2026-11-20 (#1548)
        name: 'a shell stub whose output mentions input_tokens is not a credential',
        code: 'import { writeFileSync } from \'node:fs\';\nexport const stub = (bin) => writeFileSync(bin, `#!/bin/sh\\nprintf \'{"usage":{"input_tokens":10,"output_tokens":5}}\'\\n`);',
      },
      {
        // @found ofri-peretz/burgee 2026-11-20 (#1548)
        name: 'a script that reads an API key from the environment is not one',
        code: "import { writeFileSync } from 'node:fs';\nwriteFileSync(bin, '#!/bin/sh\\necho $ANTHROPIC_API_KEY > /dev/null\\n');",
      },
      {
        // @found ofri-peretz/burgee 2026-11-20 (#1548)
        name: 'prose that mentions a password is not one',
        code: "import fs from 'node:fs';\nfs.writeFileSync(readme, 'Set the password in your shell profile.');",
      },
    ],
    invalid: [
      {
        name: 'a template file PATH that names a token still reports',
        code: "import fs from 'node:fs';\nfs.writeFileSync(`${dir}/token.json`, data);",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a literal file path that names a secret still reports',
        code: "import fs from 'node:fs';\nfs.writeFileSync('./config/client_secret.json', data);",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'the value named as a credential still reports next to content-shaped path text',
        code: "import fs from 'node:fs';\nfs.writeFileSync(`${dir}/notes for later.txt`, apiToken);",
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  },
);
