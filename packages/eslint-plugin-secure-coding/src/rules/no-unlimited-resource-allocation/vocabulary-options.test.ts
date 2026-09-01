/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Two vocabularies this rule used to assert and now asks for.
 *
 * `length`, `size` and `byteLength` are the language's and Node's — those are
 * facts. `count` is a convention, and so are `maxSize` and `limit`: they are
 * shared by body-parser, multer and a dozen others, which is precisely what
 * makes them a guess rather than an API. `maxOutputLength` is zlib's.
 *
 * Both options REPLACE the default. A default that cannot be removed is still
 * an assertion about somebody else's naming.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe as suite, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';

import { noUnlimitedResourceAllocation } from './index';

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

suite('no-unlimited-resource-allocation — the vocabulary is the consumer’s', () => {
  ruleTester.run('vocabulary-options', noUnlimitedResourceAllocation, {
    valid: [
      {
        // A project whose bound is spelled its own way is now reachable, which
        // is the point of the option.
        name: 'a house-named limit option the default list never knew',
        code: "const zlib = require('zlib'); const g = zlib.createGunzip({ houseCap: 1000 });",
        options: [{ limitOptionNames: ['houseCap'] }],
      },
      {
        name: 'a house-named size property recognises the bounded read',
        code: 'function f(chunk) { if (chunk.magnitude > 1024) return null; return chunk.slice(0, 1024); }',
        options: [{ sizeProperties: ['magnitude'] }],
      },
    ],
    invalid: [
      {
        // Narrowing the vocabulary means the default spelling stops counting
        // as a bound — which is what REPLACES has to mean.
        name: 'the default limit name no longer counts once the consumer replaces the list',
        code: "const zlib = require('zlib'); const g = zlib.createGunzip({ maxOutputLength: 1000 });",
        options: [{ limitOptionNames: ['houseCap'] }],
        errors: 1,
      },
    ],
  });
});
