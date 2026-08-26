/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Defects this rule found in code somebody else shipped.
 *
 * Every other case in this rule's suite was written by the same person who
 * wrote the rule, which means it can only prove the rule matches its author's
 * idea of the defect. These three come the other way round: the rule was run
 * over a repository, it reported, a human read the surrounding code, and the
 * maintainers accepted a fix. Each is reduced to the smallest form that still
 * reports — delete the fix and the case is the bug.
 *
 * They are locks as much as evidence. A change that silences one of these has
 * given back a finding that was worth a pull request.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noTimingUnsafeCompare } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

/**
 * `.ts`, explicitly. The rule reads a comparison's operands for evidence that
 * one of them is a secret, and a TypeScript file gives it type syntax to read;
 * on a plain `.js` file two of the three defects below go unreported. That is
 * a real limit of the rule, pinned as an `FN:` case in
 * `no-timing-unsafe-compare.test.ts` rather than hidden by the default here.
 */
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

describe('no-timing-unsafe-compare — found in the wild', () => {
  ruleTester.run('wild', noTimingUnsafeCompare, {
    valid: [
      {
        /**
         * The same defect, under the shipped defaults, silent.
         *
         * The rule requires an attacker-controlled operand before it will call
         * a comparison a timing oracle — a deliberate inversion, because
         * name-matching alone produced 27 findings and zero oracles on the
         * 8-repo corpus. The cost is visible right here: at theia-cloud the
         * secret arrives as a function PARAMETER, and the caller that fills it
         * from a request header is in another file. There is nothing in this
         * file to see.
         *
         * A default this rule is right about most of the time still missed a
         * live CWE-208 in a project with 3k stars. That is the trade, written
         * down rather than argued away.
         */
        // @found no name to read, and the rule is deliberately name-based not taint-based
        name: 'GAP: a secret arriving as a parameter has no visible taint source',
        filename: 'node/monitor/src/util/util.ts',
        code: `
          export function isAuthorized(bearerToken: string, sessionSecret: string): boolean {
            return bearerToken === sessionSecret;
          }
        `,
      },
    ],
    invalid: [
      {
        // The function gated five HTTP endpoints. CWE-208.
        //
        // It needs `reportUnverifiedComparisons` — see the FN case in the valid
        // block below for why, and what that costs.
        // @source eclipse-theia/theia-cloud node/monitor/src/util/util.ts:10
        filename: 'node/monitor/src/util/util.ts',
        name: 'a bearer token compared to a session secret gates five endpoints',
        options: [{ reportUnverifiedComparisons: true }],
        code: `
          export function isAuthorized(bearerToken: string, sessionSecret: string): boolean {
            return bearerToken === sessionSecret;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        // Gates controller registration — the privileged role. The same file
        // already used timingSafeEqual elsewhere, so the omission was local.
        // @source telepat-io/otto packages/relay/src/controller-client-utils.ts:130
        filename: 'packages/relay/src/controller-client-utils.ts',
        name: 'a registration secret header compared to the configured secret',
        code: `
          const provided = req.headers['x-otto-registration-secret'];
          if (provided === registrationSecret) {
            return registerController(req.body);
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        // KYC webhook signature verification. The guard had no test of any kind.
        // @source humanprotocol/human-protocol packages/apps/reputation-oracle/server/src/modules/kyc/kyc-webhook-auth.guard.ts:39
        filename: 'src/modules/kyc/kyc-webhook-auth.guard.ts',
        name: 'an HMAC signature compared with !== in a webhook guard',
        code: `
          const signedPayload = request.headers['human-signature'];
          const hmacSignature = crypto.createHmac('sha256', key).update(body).digest('hex');
          if (signedPayload !== hmacSignature) {
            throw new UnauthorizedException();
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
    ],
  });
});
