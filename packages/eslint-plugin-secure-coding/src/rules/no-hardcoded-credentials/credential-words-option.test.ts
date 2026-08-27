/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The name of a credential is this project's convention, not a published one.
 *
 * `innerHTML` is WHATWG's and `alg` is RFC 7519's — we can and should be
 * specific about those, because we are protecting a contract somebody else
 * defined. `apiKey` is nobody's contract. It is what a lot of codebases happen
 * to call a thing, and a rule that only knows a 40-name English list is silent
 * on every project that names its secrets any other way.
 *
 * `ignorePatterns` already existed and is subtractive: it can silence a name
 * we guessed wrong and can never add one we never thought of. `credentialWords`
 * REPLACES the list, which is the direction that was missing.
 *
 * Found by `scripts/name-dependence-probe.mts`: renaming every binding in this
 * rule's true positives silenced 24 of them, more than any other rule.
 *
 * Every value below is `aB3xK9mQ7pL2wR5t` on purpose. It looks random enough to
 * reach the NAME path and matches no vendor's key format, so these cases test
 * the vocabulary and nothing else. `sk_live_…` would report whatever the
 * variable is called — that is Stripe's published format, which is exactly the
 * kind of specificity that DOES belong hard-coded.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe as suite, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';

import { noHardcodedCredentials } from './index';

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

suite('no-hardcoded-credentials — the vocabulary is the project’s', () => {
  ruleTester.run('credentialWords', noHardcodedCredentials, {
    valid: [
      {
        // REPLACES: once the consumer states their own vocabulary, a name we
        // guessed is no longer one of theirs.
        name: 'a default name the consumer replaced out of the list',
        code: `const apiKey = 'aB3xK9mQ7pL2wR5t';`,
        options: [{ credentialWords: ['sigilo'] }],
      },
      {
        name: 'an empty vocabulary reports no name-based credential at all',
        code: `const password = 'aB3xK9mQ7pL2wR5t';`,
        options: [{ credentialWords: [] }],
      },
    ],
    invalid: [
      {
        // A vendor's key FORMAT is somebody else's published contract, so it
        // reports whatever the binding is called — including when the consumer
        // has replaced the name vocabulary entirely. Pinned so the two paths
        // cannot be confused later.
        name: 'a vendor key format reports on its value, whatever the name',
        // The value carries FAKE_LIVE_KEY_FOR_TESTING_PURPOSES_ONLY because
        // GitHub push protection blocks a plausible-looking `sk_live_` body at
        // the remote — after the whole pre-push gate has already run. Every
        // other fixture in this plugin uses the same marker; see the
        // credential-fixture-shape lock.
        code: `const anything = 'sk_live_FAKE_LIVE_KEY_FOR_TESTING_PURPOSES_ONLY_123456';`,
        options: [{ credentialWords: [] }],
        errors: 1,
      },
      {
        // The point of the option: a project whose secrets are not named in
        // English is now reachable.
        name: 'a credential named in a language the default list is not written in',
        code: `const sigilo = 'aB3xK9mQ7pL2wR5t';`,
        options: [{ credentialWords: ['sigilo'] }],
        errors: 1,
      },
      {
        name: 'the vocabulary is case-insensitive',
        code: `const SIGILO = 'aB3xK9mQ7pL2wR5t';`,
        options: [{ credentialWords: ['sigilo'] }],
        errors: 1,
      },
      {
        name: 'a trailing s is covered without listing the plural',
        code: `const sigilos = ['aB3xK9mQ7pL2wR5t'];`,
        options: [{ credentialWords: ['sigilo'] }],
        errors: 1,
      },
    ],
  });
});
