/**
 * Tests for no-algorithm-confusion rule
 * Security: CWE-347 (Algorithm Confusion Attack)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noAlgorithmConfusion } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-algorithm-confusion', () => {
  describe('Valid Code - Safe Patterns', () => {
    ruleTester.run(
      'valid - asymmetric algorithms with public keys',
      noAlgorithmConfusion,
      {
        valid: [
          // RS256 with public key - SAFE
          {
            name: 'the asymmetric algorithm the key actually belongs to',
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { algorithms: ['RS256'] });`,
          },
          // ES256 with public key - SAFE
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { algorithms: ['ES256'] });`,
          },
          // Multiple asymmetric algorithms
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { algorithms: ['RS256', 'ES256'] });`,
          },
          // HS256 with secret (not public key) - SAFE
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { algorithms: ['HS256'] });`,
          },
          // HS256 with env var - SAFE
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });`,
          },
          // No options specified
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey);`,
          },
          // Sign operation (not verify)
          {
            code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, privateKey, { algorithm: 'HS256' });`,
          },
          // Only 1 argument (edge case - line 157 coverage)
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token);`,
          },
          // No key that looks like public key
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, sharedSecret, { algorithms: ['HS256'] });`,
          },
          // Empty options object with public key (no algorithms)
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, {});`,
          },
          // Options without algorithms property
          {
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { complete: true });`,
          },
        ],
        invalid: [],
      },
    );
  });

  describe('Invalid Code - Algorithm Confusion', () => {
    /*
     * Audit 2026-10 (zero-deferral pass, owner decision on FP-12): every case
     * in this valid list used to be INVALID. Each one decided the key was
     * "public" from the key's NAME — `publicKey`, `getPublicKey()`, `jwksKey`
     * matched by `/public/i`, `/publicKey/i`, `/getPublicKey/i` and `/jwks/i`
     * against the source text — so renaming the variable to `foo` silenced it
     * and an HMAC secret named `PUBLIC_WIDGET_SECRET` tripped it. The name
     * heuristic is gone. A key is public now only on structural evidence
     * (a PEM public header, `createPublicKey()`, jose's `importSPKI` /
     * `importX509` / `createRemoteJWKSet`, a jwks-rsa signing key, a `.pub` /
     * `.pem` file read); the structural equivalents of these cases are in
     * the "public key evidence" block below. Only the mixed-family case stays
     * here, because a whitelist that admits HS* and RS* is the CVE whatever
     * the key is called.
     */
    ruleTester.run(
      'flipped - a key NAME is not evidence the key is public',
      noAlgorithmConfusion,
      {
        valid: [
          {
            name: 'no evidence: HS256 against an identifier named publicKey',
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { algorithms: ['HS256'] });`,
          },
          {
            name: 'no evidence: a runtime-keyed sibling beside HS256 and a publicKey name',
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { [extra]: 1, algorithms: ['HS256'] });`,
          },
          ...[
            { label: 'a quoted key', key: "'algorithms'" },
            { label: 'a computed key', key: "['algorithms']" },
          ].map(({ label, key }) => ({
            name: `no evidence: HS256 behind ${label} with a publicKey name`,
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { ${key}: ['HS256'] });`,
          })),
          {
            name: 'no evidence: HS384 against a publicKey name',
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { algorithms: ['HS384'] });`,
          },
          {
            name: 'no evidence: HS512 against a publicKey name',
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { algorithms: ['HS512'] });`,
          },
          {
            name: 'no evidence: the singular algorithm option with a publicKey name',
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { algorithm: 'HS256' });`,
          },
          {
            name: 'no evidence: an unbound getPublicKey() call',
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, getPublicKey(), { algorithms: ['HS256'] });`,
          },
          {
            name: 'no evidence: an identifier named jwksKey',
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, jwksKey, { algorithms: ['HS256'] });`,
          },
          {
            name: 'no evidence: the alg shorthand with a publicKey name',
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { alg: 'HS256' });`,
          },
          {
            name: 'no evidence: jwtVerify with a publicKey name',
            code: `import jwt from 'jsonwebtoken';
jwtVerify(token, publicKey, { algorithms: ['HS256'] });`,
          },
        ],
        invalid: [
          // Mixed algorithms with symmetric — structural, kept.
          {
            name: 'a whitelist mixing RS256 and HS256',
            code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { algorithms: ['RS256', 'HS256'] });`,
            errors: [{ messageId: 'algorithmConfusion' }],
          },
        ],
      },
    );
  });
});

// ---------------------------------------------------------------------------
// FP/FN audit 2026-10
// ---------------------------------------------------------------------------
describe('no-algorithm-confusion — audit 2026-10', () => {
  ruleTester.run('mixed algorithm families', noAlgorithmConfusion, {
    valid: [
      {
        name: 'an HMAC-only list with a key nothing marks as public',
        code: `import jwt from 'jsonwebtoken';
jwt.verify(token, foo, { algorithms: ['HS256', 'HS512'] });`,
      },
      {
        name: 'an asymmetric-only list with any key',
        code: `import jwt from 'jsonwebtoken';
jwt.verify(token, foo, { algorithms: ['RS256', 'ES256', 'EdDSA'] });`,
      },
      {
        // Flipped (FP-12): the key's only "public" evidence was its name.
        name: 'no evidence: HS* in a const options object with a publicKey name',
        code: `import jwt from 'jsonwebtoken';
const opts = { algorithms: ['HS256'] };
jwt.verify(token, publicKey, opts);`,
      },
      {
        name: 'unresolvable options say nothing about algorithms',
        code: `import jwt from 'jsonwebtoken';
export const f = (t, k, o) => jwt.verify(t, k, o);`,
      },
    ],
    invalid: [
      {
        // CVE-2015-9235's shape. The key's NAME is irrelevant: a whitelist
        // that admits both HMAC and RSA lets the attacker pick HS256 and sign
        // with whatever key material the verifier holds.
        name: 'FP-12/FN: HS* mixed with RS* — the key name does not matter',
        code: `import jwt from 'jsonwebtoken';
const cert = fs.readFileSync('/etc/keys/jwtRS256.key.pub');
jwt.verify(token, cert, { algorithms: ['RS256', 'HS256'] });`,
        errors: [{ messageId: 'algorithmConfusion' }],
      },
      {
        name: 'FP-1/FN: a mixed list inside a const options object',
        code: `import jwt from 'jsonwebtoken';
const opts = { algorithms: ['ES256', 'HS384'] };
jwt.verify(token, foo, opts);`,
        errors: [{ messageId: 'algorithmConfusion' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// Zero-deferral pass (audit 2026-10): public-key EVIDENCE, not names.
// ---------------------------------------------------------------------------
describe('no-algorithm-confusion — public key evidence', () => {
  ruleTester.run('structural public-key evidence', noAlgorithmConfusion, {
    valid: [
      {
        // @found FP-12, harness-reproduced FP/FN audit 2026-10-10 (benchmarks/audits/2026-10-10-fp-fn-jwt-security.md)
        name: 'FP: an HMAC secret whose name contains PUBLIC is not a public key',
        code: `import jwt from 'jsonwebtoken';
jwt.verify(token, process.env.PUBLIC_WIDGET_HMAC_SECRET, { algorithms: ['HS256'], issuer: 'w' });`,
      },
      {
        name: 'a key read from a file that is not a public-key file',
        code: `import jwt from 'jsonwebtoken';
import fs from 'node:fs';
jwt.verify(token, fs.readFileSync(secretPath), { algorithms: ['HS256'] });`,
      },
      {
        name: 'a private-key PEM is not public material',
        code: `import jwt from 'jsonwebtoken';
const k = '-----BEGIN PRIVATE KEY-----\\nMIIE';
jwt.verify(token, k, { algorithms: ['HS256'] });`,
      },
      {
        name: 'a call from an unrelated module is no evidence',
        code: `import jwt from 'jsonwebtoken';
import { loadKey } from './keys';
jwt.verify(token, loadKey(), { algorithms: ['HS256'] });`,
      },
    ],
    invalid: [
      {
        name: 'HS256 against a PEM public key held in a const',
        code: `import jwt from 'jsonwebtoken';
const pem = '-----BEGIN PUBLIC KEY-----\\nMFkw';
jwt.verify(token, pem, { algorithms: ['HS256'] });`,
        errors: [{ messageId: 'algorithmConfusion' }],
      },
      {
        name: "HS256 against node:crypto's createPublicKey",
        code: `import jwt from 'jsonwebtoken';
import { createPublicKey } from 'node:crypto';
const key = createPublicKey(pem);
jwt.verify(token, key, { [extra]: 1, 'algorithms': ['HS256'] });`,
        errors: [{ messageId: 'algorithmConfusion' }],
      },
      {
        name: "HS384 against jose's importSPKI",
        code: `import { importSPKI, jwtVerify } from 'jose';
const key = await importSPKI(pem, 'RS256');
await jwtVerify(token, key, { ['algorithms']: ['HS384'] });`,
        errors: [{ messageId: 'algorithmConfusion' }],
      },
      {
        name: 'HS256 against a remote JWKS',
        code: `import * as jose from 'jose';
const JWKS = jose.createRemoteJWKSet(new URL(u));
await jose.jwtVerify(token, JWKS, { algorithm: 'HS256' });`,
        errors: [{ messageId: 'algorithmConfusion' }],
      },
      {
        name: 'HS512 against a jwks-rsa signing key',
        code: `import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
const client = jwksClient({ jwksUri });
export async function check(token, kid) {
  const signingKey = await client.getSigningKey(kid);
  return jwt.verify(token, signingKey.getPublicKey(), { alg: 'HS512' });
}`,
        errors: [{ messageId: 'algorithmConfusion' }],
      },
      {
        name: 'HS256 against a .pub file read',
        code: `import jwt from 'jsonwebtoken';
import { readFileSync } from 'node:fs';
jwt.verify(token, readFileSync('/etc/keys/jwt.key.pub'), { algorithms: ['HS256'] });`,
        errors: [{ messageId: 'algorithmConfusion' }],
      },
    ],
  });
});
