/**
 * no-dynamic-algorithm-selection — divergences the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/no_dynamic_algorithm_selection.qnt).
 *
 *   - only the `crypto.<fn>(...)` member spelling was checked, so a
 *     destructured, renamed or namespace import went silent;
 *   - a local object named `crypto` was treated as node:crypto;
 *   - the doc's own allowlist example was reported.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDynamicAlgorithmSelection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-dynamic-algorithm-selection fidelity', () => {
  ruleTester.run(
    'crypto resolution and allowlists',
    noDynamicAlgorithmSelection,
    {
      valid: [
        {
          name: "the doc's allowlist example is not a finding",
          code: `const crypto = require('crypto');
const ALGORITHMS = { strong: 'sha256', stronger: 'sha512' };
export function hash(value: string, tier: string) {
  const algorithm = ALGORITHMS[tier as keyof typeof ALGORITHMS];
  if (!algorithm) throw new Error(\`unsupported tier: \${tier}\`);
  return crypto.createHash(algorithm).update(value).digest('hex');
}`,
        },
        {
          name: 'an inline lookup into an as-const allowlist is not a finding',
          code: `import crypto from 'node:crypto';
const ALGORITHMS = { strong: 'sha256' } as const;
export function hash(tier: 'strong') { return crypto.createHash(ALGORITHMS[tier]); }`,
        },
        {
          name: 'a local object named crypto is not node:crypto',
          code: `const crypto = { createHash: (...args: unknown[]) => args };
export function run(algorithm: string) { return crypto.createHash(algorithm); }`,
        },
      ],
      invalid: [
        {
          name: 'a destructured createHash with a parameter algorithm is reported',
          code: `const { createHash } = require('node:crypto');
export function run(algorithm: string) { return createHash(algorithm); }`,
          errors: [{ messageId: 'dynamicAlgorithm' }],
        },
        {
          name: 'a renamed createHmac with an env algorithm is reported',
          code: `import { createHmac as make } from 'node:crypto';
export function run(key: string) { return make(process.env.CRYPTO_ALG as string, key); }`,
          errors: [{ messageId: 'dynamicAlgorithm' }],
        },
        {
          name: 'a namespace bracket createCipheriv with a record field is reported',
          code: `import * as nodeCrypto from 'node:crypto';
export function run(record: any, key: any, iv: any) { return nodeCrypto['createCipheriv'](record.algName, key, iv); }`,
          errors: [{ messageId: 'dynamicAlgorithm' }],
        },
        {
          name: 'a lookup into a table written through is reported',
          code: `import crypto from 'node:crypto';
const TABLE: Record<string, string> = { strong: 'sha256' };
TABLE.legacy = String(Date.now());
export function run(tier: string) { return crypto.createHash(TABLE[tier]); }`,
          errors: [{ messageId: 'dynamicAlgorithm' }],
        },
      ],
    },
  );
});
