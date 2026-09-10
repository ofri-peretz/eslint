/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe } from 'vitest';

import { noWeakDhParameters } from './index';

const ruleTester = new RuleTester();

describe('no-weak-dh-parameters', () => {
  ruleTester.run('no-weak-dh-parameters', noWeakDhParameters, {
    valid: [
      {
        name: 'modp14 is the 2048-bit group and clears the floor',
        code: `const crypto = require('crypto');
               const dh = crypto.getDiffieHellman('modp14');`,
      },
      {
        name: 'modp18 is 8192-bit',
        code: `import { getDiffieHellman } from 'node:crypto';
               const dh = getDiffieHellman('modp18');`,
      },
      {
        name: 'a 3072-bit generated prime clears the floor',
        code: `const crypto = require('crypto');
               crypto.createDiffieHellman(3072);`,
      },
      {
        name: 'prime256v1 is not a weak curve',
        code: `const crypto = require('crypto');
               crypto.createECDH('prime256v1');`,
      },
      {
        name: 'secp384r1 is not a weak curve',
        code: `const crypto = require('crypto');
               crypto.createECDH('secp384r1');`,
      },
      {
        name: 'secp224r1 sits exactly on the 224-bit floor',
        code: `const crypto = require('crypto');
               crypto.createECDH('secp224r1');`,
      },
      {
        name: 'an unknown group name is not assumed weak',
        // A future RFC group must not become a finding by being unrecognised.
        code: `const crypto = require('crypto');
               crypto.getDiffieHellman('modp99');`,
      },
      {
        name: 'a prime supplied as a Buffer states no length here',
        // The string/Buffer overload passes a prime chosen elsewhere; judging
        // it would mean reading the prime, which a structural rule cannot do.
        code: `const crypto = require('crypto');
               crypto.createDiffieHellman(knownPrime, 'base64');`,
      },
      {
        name: 'a computed group name is not resolvable and is left alone',
        code: `const crypto = require('crypto');
               crypto.getDiffieHellman(groupFromConfig);`,
      },
      {
        // Same reasoning on the curve arm: nothing here states a curve, so
        // there is nothing to measure.
        name: 'a computed curve name is not resolvable and is left alone',
        code: `const crypto = require('crypto');
               crypto.createECDH(curveFromConfig);`,
      },
      {
        name: 'no arguments at all',
        code: `const crypto = require('crypto');
               crypto.createECDH();`,
      },
      {
        // The callee is a CallExpression, not a member or an identifier, so
        // nothing at this site names an API. `calleeName` returns null and the
        // rule declines rather than guessing at what the factory returned.
        name: 'a callee returned by another call names nothing',
        code: `const crypto = require('crypto');
               getFactory()('modp1');`,
      },
      {
        // A computed member with a non-literal key: `propertyName` cannot
        // resolve a method name, so there is no API to match.
        name: 'a dynamically indexed method names nothing',
        code: `const crypto = require('crypto');
               crypto[whichever]('modp1');`,
      },
      {
        name: 'a lower floor accepts what the default rejects',
        code: `const crypto = require('crypto');
               crypto.createDiffieHellman(1024);`,
        options: [{ minPrimeBits: 1024 }],
      },
      {
        name: 'allowInTests silences a test file',
        filename: 'src/crypto.test.ts',
        code: `const crypto = require('crypto');
               crypto.getDiffieHellman('modp1');`,
        options: [{ allowInTests: true }],
      },
    ],
    invalid: [
      {
        // The same code as the allowInTests case above. Without the option the
        // file being a test changes nothing — otherwise the option would be
        // indistinguishable from the default and its test would prove nothing.
        name: 'a test file is not exempt by default',
        filename: 'src/crypto.test.ts',
        code: `const crypto = require('crypto');
               crypto.getDiffieHellman('modp1');`,
        errors: [{ messageId: 'weakModpGroup' }],
      },
      {
        name: 'modp1 is the 768-bit group Logjam broke',
        code: `const crypto = require('crypto');
               const dh = crypto.getDiffieHellman('modp1');`,
        errors: [{ messageId: 'weakModpGroup' }],
      },
      {
        name: 'modp2 is 1024-bit',
        code: `import { getDiffieHellman } from 'node:crypto';
               const dh = getDiffieHellman('modp2');`,
        errors: [{ messageId: 'weakModpGroup' }],
      },
      {
        name: 'createDiffieHellmanGroup takes the same group names',
        code: `const crypto = require('crypto');
               crypto.createDiffieHellmanGroup('modp5');`,
        errors: [{ messageId: 'weakModpGroup' }],
      },
      {
        name: 'a group named through a constant is still that group',
        code: `const crypto = require('crypto');
               const GROUP = 'modp2';
               crypto.getDiffieHellman(GROUP);`,
        errors: [{ messageId: 'weakModpGroup' }],
      },
      {
        name: 'a 512-bit generated prime',
        code: `const crypto = require('crypto');
               crypto.createDiffieHellman(512);`,
        errors: [{ messageId: 'weakPrimeLength' }],
      },
      {
        name: 'a 1024-bit generated prime is below the default floor',
        code: `const crypto = require('crypto');
               crypto.createDiffieHellman(1024);`,
        errors: [{ messageId: 'weakPrimeLength' }],
      },
      {
        name: 'secp192k1 is under 224 bits',
        code: `const crypto = require('crypto');
               crypto.createECDH('secp192k1');`,
        errors: [{ messageId: 'weakCurve' }],
      },
      {
        name: 'a binary-field curve under 224 bits',
        code: `import { createECDH } from 'node:crypto';
               createECDH('sect163k1');`,
        errors: [{ messageId: 'weakCurve' }],
      },
      {
        name: 'additionalWeakCurves extends the list without a release',
        code: `const crypto = require('crypto');
               crypto.createECDH('brainpoolP224r1');`,
        options: [{ additionalWeakCurves: ['brainpoolP224r1'] }],
        errors: [{ messageId: 'weakCurve' }],
      },
      {
        name: 'raising the floor rejects what the default accepts',
        code: `const crypto = require('crypto');
               crypto.getDiffieHellman('modp14');`,
        options: [{ minPrimeBits: 3072 }],
        errors: [{ messageId: 'weakModpGroup' }],
      },
    ],
  });
});

describe('the rename litmus: no finding depends on a name the author chose', () => {
  ruleTester.run('no-weak-dh-parameters', noWeakDhParameters, {
    valid: [],
    invalid: [
      {
        // Every identifier the author controls is renamed to foo/bar. What is
        // left — the crypto API name and the protocol constant — is the whole
        // basis of the finding, and both belong to Node, not to this file.
        name: 'still fires with every author-chosen identifier renamed',
        code: `const foo = require('crypto');
               const bar = foo.getDiffieHellman('modp1');`,
        errors: [{ messageId: 'weakModpGroup' }],
      },
    ],
  });
});
