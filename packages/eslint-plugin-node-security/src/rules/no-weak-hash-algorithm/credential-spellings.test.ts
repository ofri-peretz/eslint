/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Which spellings of "this is a credential" the rule can see.
 *
 * Found by an adversarial wave on 2026-08-23: seventeen common credential
 * identifiers were hashed with MD5 and **twelve were silent**. Every one is
 * CWE-327 — `passphrase`, `otp`, `mfaCode`, `pinCode`, `masterKey`,
 * `securityAnswer`, and the wallet pair `seedPhrase` / `mnemonic`, where an
 * MD5 digest is about as bad as this rule gets.
 *
 * The list is chosen against `makeNameTest`'s mechanics rather than by feel:
 * an entry under six characters matches WHOLE WORDS only, so `pwd` reads `pwd`
 * and `userPwd` and cannot collide inside a longer word; entries of six or more
 * also match as a substring of the joined identifier, which is why compounds
 * are listed whole — `pincode`, not `pin`.
 *
 * The invalid block is the recall claim. The valid block is the FP control, and
 * it is the half that decides whether the additions were safe: `passenger`,
 * `bypassRoute`, `pinnedTabs`, `mapPin`, `passingTests` and `seedData` all sit
 * one careless list entry away from reporting.
 *
 * Measured on the pinned 8-repository corpus: 925 findings before the change
 * and 925 after. Pure recall, no cost on real code.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noWeakHashAlgorithm } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

const hash = (name: string) =>
  `import crypto from 'crypto';\nexport const h = (${name}: string) => crypto.createHash('md5').update(${name}).digest('hex');`;

const NOW_DETECTED = [
  'passphrase',
  'passPhrase',
  'otp',
  'mfaCode',
  'pinCode',
  'masterKey',
  'securityAnswer',
  'seedPhrase',
  'mnemonic',
  // The list carries these three; without a case here they were claims, not
  // coverage. `totp` is four characters, so it matches whole words only —
  // `totp` and `userTotp`, never inside `total`.
  //
  // `userTotp`, NOT `totpSecret`: `secret` is already a list entry, so a
  // `totpSecret` case passes whether or not `totp` was ever added. It would
  // have been a test that stays green on the code it exists to lock.
  'totp',
  'userTotp',
  'recoveryCode',
  'backupCode',
];

/**
 * Not credentials. Each is deliberately close to an entry in the list.
 *
 * The `pwd*` three are why `pwd` is not in the list. It was added first — the
 * commonest short spelling of "password", and the highest-value entry on
 * paper — and a wider FP control caught all three of these reporting CWE-327
 * over ordinary filesystem code. In Node, `pwd` is also the working directory.
 * `password` has no second meaning; `pwd` does, in exactly the ecosystem this
 * plugin targets.
 */
const STILL_QUIET = [
  'pwdDirectory',
  'pwdPath',
  'currentPwd',
  'passenger',
  'bypassRoute',
  'pinnedTabs',
  'mapPin',
  'passingTests',
  'seedData',
  // Controls for the three above. `total*` is the whole reason `totp` is safe
  // at four characters; the other two are the ordinary non-credential senses
  // of "recovery" and "backup", which are far commoner than the code senses.
  'totalCount',
  'subtotal',
  'recoveryTime',
  'recoveryPoint',
  'backupFile',
  'backupPath',
  'etag',
  'cacheKey',
  'checksum',
];

ruleTester.run(
  'no-weak-hash-algorithm — credential spellings',
  noWeakHashAlgorithm,
  {
    valid: STILL_QUIET.map((name) => ({ code: hash(name) })),
    invalid: NOW_DETECTED.map((name) => ({
      code: hash(name),
      errors: 1,
    })),
  },
);
