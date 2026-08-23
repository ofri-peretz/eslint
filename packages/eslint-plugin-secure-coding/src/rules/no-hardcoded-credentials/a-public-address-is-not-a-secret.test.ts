/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A public blockchain address is not a hard-coded secret.
 *
 * Hand-verification run 2026-08-22. shardeum/json-rpc-server `src/api.ts:1770`
 * fills in a default `from` before simulating an `eth_call`:
 *
 *   callObj['from'] = '0x2041B9176A4839dAf7A4DcC6a97BA023953d9ad9'
 *
 * That is an EVM ACCOUNT ADDRESS — the public half, published by every
 * transaction the account has ever sent and indexed by every block explorer.
 * It was reported as `Hard-coded Secret key`, CWE-798, CVSS 9.8, tagged
 * SOC2/PCI-DSS/HIPAA. The predicate at fault is `CREDENTIAL_PATTERNS.secretKey`
 * — 32+ characters of base64 alphabet — which every address clears.
 *
 * The exemption is exactly `0x` + 40 hex, and the length is the whole guard: an
 * EVM PRIVATE key is `0x` + 64 hex and a transaction hash is 64 too, so the
 * invalid cases below pin that neither is exempted.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noHardcodedCredentials } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-hardcoded-credentials — a public address is not a secret',
  noHardcodedCredentials,
  {
    valid: [
      // The corpus shape, both spellings of the slot.
      `const defaultFrom = '0x2041B9176A4839dAf7A4DcC6a97BA023953d9ad9';`,
      `callObj['from'] = '0x2041B9176A4839dAf7A4DcC6a97BA023953d9ad9';`,
      // Lower-case and all-caps hex are the same address; the checksum is only
      // in the casing.
      `const burn = '0x000000000000000000000000000000000000dead';`,
      // …and a credential-named slot does not make one a credential. The value
      // is public whatever it is called.
      `const apiKey = '0x2041B9176A4839dAf7A4DcC6a97BA023953d9ad9';`,
    ],
    invalid: [
      // 64 hex — an EVM private key. The positive control for the length guard:
      // if this ever goes quiet the exemption has been widened to `{40,}`.
      {
        code: `const privateKey = '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318';`,
        errors: 1,
      },
      // Not an address: 39 hex, one short.
      {
        code: `const apiKey = '0x2041B9176A4839dAf7A4DcC6a97BA023953d9a';`,
        errors: 1,
      },
    ],
  },
);
