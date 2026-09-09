/**
 * jose's JWS-level verification is part of this plugin's surface.
 *
 * The published coverage table said 100% while `compactVerify`,
 * `flattenedVerify` and `generalVerify` appeared nowhere in these sources —
 * because the table was a hand-typed constant, not a measurement. All three
 * verify a signature with whatever algorithm the token header asks for unless
 * `algorithms` is passed, which is the substitution attack this plugin exists
 * to catch.
 *
 * The second describe block is the reason this is not a one-line change to
 * JWT_METHODS.VERIFY: a JWS carries no claims, so a rule demanding `audience`
 * on `compactVerify` would fire on every correct call.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe } from 'vitest';

import { requireAlgorithmWhitelist } from './index';
import { requireAudienceValidation } from '../require-audience-validation';

const ruleTester = new RuleTester();

describe('require-algorithm-whitelist covers jose JWS verification', () => {
  ruleTester.run('require-algorithm-whitelist', requireAlgorithmWhitelist, {
    valid: [
      {
        name: 'compactVerify pinned to one algorithm',
        code: `
          import { compactVerify } from 'jose';
          await compactVerify(jws, key, { algorithms: ['ES256'] });
        `,
      },
      {
        name: 'flattenedVerify pinned to one algorithm',
        code: `
          import { flattenedVerify } from 'jose';
          await flattenedVerify(jws, key, { algorithms: ['RS256'] });
        `,
      },
      {
        name: 'generalVerify pinned to one algorithm',
        code: `
          import { generalVerify } from 'jose';
          await generalVerify(jws, key, { algorithms: ['RS256'] });
        `,
      },
    ],
    invalid: [
      {
        name: 'compactVerify with no options trusts the header algorithm',
        code: `
          import { compactVerify } from 'jose';
          await compactVerify(jws, key);
        `,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'flattenedVerify with no options',
        code: `
          import { flattenedVerify } from 'jose';
          await flattenedVerify(jws, key);
        `,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'generalVerify with no options',
        code: `
          import { generalVerify } from 'jose';
          await generalVerify(jws, key);
        `,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
    ],
  });
});

describe('a claim rule stays off the JWS entry points', () => {
  ruleTester.run('require-audience-validation', requireAudienceValidation, {
    valid: [
      {
        // `compactVerify` takes no `audience` option — jose validates claims in
        // `jwtVerify`. Reporting here would be unfixable by the author.
        name: 'compactVerify is not asked for an audience it cannot accept',
        code: `
          import { compactVerify } from 'jose';
          await compactVerify(jws, key, { algorithms: ['ES256'] });
        `,
      },
    ],
    invalid: [],
  });
});
