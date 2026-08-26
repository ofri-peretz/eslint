/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A defect this rule found in code somebody else shipped.
 *
 * `app.enable('trust proxy')` with no hop count makes `req.ip` whatever the
 * X-Forwarded-For header says — and cncjs gates access on `req.ip` through
 * `authorizeIPAddress`. The allowlist becomes a header the caller writes.
 * CWE-348. Disclosure drafted; not yet sent, which is why the case says what
 * it does and no more.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noPermissiveTrustProxy } from './index';

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

describe('no-permissive-trust-proxy — found in the wild', () => {
  ruleTester.run('wild', noPermissiveTrustProxy, {
    valid: [],
    invalid: [
      {
        // @source cncjs/cncjs app.js:77
        filename: 'app.js',
        name: 'trust proxy enabled in front of an IP allowlist',
        code: `
          import 'express';
          const app = express();
          app.enable('trust proxy');
          app.use((req, res, next) => authorizeIPAddress(req.ip).then(next).catch(() => res.sendStatus(403)));
        `,
        errors: [
          {
            messageId: 'permissiveTrustProxy' as const,
            suggestions: [
              {
                messageId: 'useHopCount' as const,
                output: `
          import 'express';
          const app = express();
          app.set('trust proxy', 1);
          app.use((req, res, next) => authorizeIPAddress(req.ip).then(next).catch(() => res.sendStatus(403)));
        `,
              },
            ],
          },
        ],
      },
    ],
  });
});
