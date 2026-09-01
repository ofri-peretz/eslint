/**
 * Comprehensive tests for no-unencrypted-transmission rule
 * CWE-319: Cleartext Transmission of Sensitive Information
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnencryptedTransmission } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('no-unencrypted-transmission', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - secure protocols', noUnencryptedTransmission, {
      valid: [
        // A protocol string being TESTED is not a transmission. Ungated, this
        // rule flagged the security check itself — measured on the Interlace
        // repo, the finding landed inside an `if` that skips insecure URLs.
        `if (url.startsWith('http://')) return;`,
        // An XML namespace is an identifier, never fetched — and every inline
        // SVG in every React codebase carries one. Changing it to https breaks
        // the document.
        `const svg = <svg xmlns="http://www.w3.org/2000/svg" />;`,
        `el.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xlink', v);`,
        `if (url.includes('ws://')) reject();`,
        `const isPlain = protocol === 'http://';`,
        `const clean = raw.replace('http://', 'https://');`,
        // HTTPS
        {
          name: 'an https URL',
          code: 'const url = "https://api.example.com";',
        },
        {
          code: 'fetch("https://api.example.com/data");',
        },
        // WSS
        {
          code: 'const ws = new WebSocket("wss://acmecorp.io");',
        },
        // Secure database connections
        {
          code: 'const db = "mongodb+srv://user:pass@cluster.mongodb.net";',
        },
        {
          code: 'const redis = "rediss://localhost:6379";',
        },
        // Test files (when allowInTests is true)
        {
          code: 'const url = "http://localhost:3000";',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [
        // `http://` left this rule's DEFAULTS (it belongs to no-http-urls /
        // require-https-only / detect-mixed-content), so these two locks now
        // run under the explicit opt-in. The distinction they pin — receiver
        // vs. argument, search operand vs. replacement — is a property of
        // `isProtocolInspection` and has to stay covered wherever the scheme
        // is enabled.
        {
          name: 'an http endpoint used in a comparison that gates a request',
          // The literal is the RECEIVER, not an argument — an http:// URL written
          // into source, which is the thing this rule is for.
          code: `const ok = 'http://legacy.example.com'.startsWith(prefix);`,
          options: [{ insecureProtocols: ['http://'] }],
          errors: 1,
        },

        {
          // The replacement argument is content being written, not a search
          // operand — an insecure destination that must still report.
          code: `const fixed = url.replace(/^https:/, 'http://legacy.example.com');`,
          options: [{ insecureProtocols: ['http://'] }],
          errors: 1,
        },
      ],
    });
  });

  describe('Invalid Code - HTTP', () => {
    ruleTester.run('invalid - HTTP protocol', noUnencryptedTransmission, {
      valid: [],
      invalid: [
        {
          code: 'const url = "http://api.example.com";',
          options: [{ insecureProtocols: ['http://'] }],
          errors: [
            {
              messageId: 'unencryptedTransmission',
              data: {
                issue: 'using insecure protocol http://',
                safeAlternative: 'Use https:// instead of http://',
              },
              suggestions: [
                {
                  messageId: 'useHttps',
                  data: {
                    protocol: 'http://',
                    secureProtocol: 'https://',
                  },
                  output: 'const url = "https://api.example.com";',
                },
              ],
            },
          ],
        },
        {
          code: 'fetch("http://api.example.com/data");',
          options: [{ insecureProtocols: ['http://'] }],
          errors: [
            {
              messageId: 'unencryptedTransmission',
              data: {
                issue: 'using insecure protocol http://',
                safeAlternative: 'Use https:// instead of http://',
              },
              suggestions: [
                {
                  messageId: 'useHttps',
                  data: {
                    protocol: 'http://',
                    secureProtocol: 'https://',
                  },
                  output: 'fetch("https://api.example.com/data");',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - WebSocket', () => {
    ruleTester.run('invalid - WS protocol', noUnencryptedTransmission, {
      valid: [],
      invalid: [
        {
          code: 'const ws = new WebSocket("ws://acmecorp.io");',
          options: [{ insecureProtocols: ['ws://'] }],
          errors: [
            {
              messageId: 'unencryptedTransmission',
              data: {
                issue: 'using insecure protocol ws://',
                safeAlternative: 'Use wss:// instead of ws://',
              },
              suggestions: [
                {
                  messageId: 'useHttps',
                  data: {
                    protocol: 'ws://',
                    secureProtocol: 'wss://',
                  },
                  output: 'const ws = new WebSocket("wss://acmecorp.io");',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Database Connections', () => {
    ruleTester.run(
      'invalid - unencrypted database',
      noUnencryptedTransmission,
      {
        valid: [],
        invalid: [
          {
            code: 'const db = "mongodb://user:pass@localhost:27017";',
            errors: [
              {
                messageId: 'unencryptedTransmission',
                data: {
                  issue: 'using insecure protocol mongodb://',
                  safeAlternative: 'Use mongodb+srv:// instead of mongodb://',
                },
                suggestions: [
                  {
                    messageId: 'useHttps',
                    data: {
                      protocol: 'mongodb://',
                      secureProtocol: 'mongodb+srv://',
                    },
                    output:
                      'const db = "mongodb+srv://user:pass@localhost:27017";',
                  },
                ],
              },
            ],
          },
          {
            code: 'const redis = "redis://localhost:6379";',
            errors: [
              {
                messageId: 'unencryptedTransmission',
                data: {
                  issue: 'using insecure protocol redis://',
                  safeAlternative: 'Use rediss:// instead of redis://',
                },
                suggestions: [
                  {
                    messageId: 'useHttps',
                    data: {
                      protocol: 'redis://',
                      secureProtocol: 'rediss://',
                    },
                    output: 'const redis = "rediss://localhost:6379";',
                  },
                ],
              },
            ],
          },
        ],
      },
    );
  });

  describe('Invalid Code - Template Literals', () => {
    ruleTester.run(
      'invalid - insecure protocol in template',
      noUnencryptedTransmission,
      {
        valid: [],
        invalid: [
          {
            code: 'const url = `http://${host}/api`;',
            options: [{ insecureProtocols: ['http://'] }],
            errors: [
              {
                messageId: 'unencryptedTransmission',
                data: {
                  issue: 'using insecure protocol http:// in template literal',
                  safeAlternative: 'Use https:// instead of http://',
                },
                suggestions: undefined,
              },
            ],
          },
        ],
      },
    );
  });

  /*
   * ── Family partition: `http://` and `ws://` are not this rule's ────────────
   *
   * Both left `DEFAULT_INSECURE_PROTOCOLS`. They belong to rules that say more
   * about them:
   *
   *   http:// -> require-https-only / detect-mixed-content / no-http-urls
   *   ws://   -> require-websocket-wss / no-insecure-websocket
   *
   * This rule kept the NON-WEB protocols, which nothing else in the package
   * detects. Before the split it was one of three reports on
   * `const API_BASE = "http://…"` and one of three on
   * `new WebSocket("ws://…")`, contributing no fact the owner had not stated.
   *
   * The opt-in is deliberate and still tested above: listing `'http://'` in
   * `insecureProtocols` restores the old behaviour for a project that wants
   * the second opinion.
   */
  describe('Family partition', () => {
    ruleTester.run(
      'partition - web schemes are owned by siblings',
      noUnencryptedTransmission,
      {
        valid: [
          { code: 'const API_BASE = "http://api.acmecorp.io";' },
          { code: 'fetch("http://api.acmecorp.io/v1/users");' },
          { code: 'el.src = "http://cdn.acmecorp.io/a.js";' },
          { code: 'const url = `http://${host}/api`;' },
          { code: 'const ws = new WebSocket("ws://live.acmecorp.io");' },
          { code: 'const SOCKETS = { live: "ws://live.acmecorp.io" };' },
        ],
        invalid: [
          // FN GUARD — the non-web schemes must be untouched by the split.
          // A connection string usually carries credentials too, which is why
          // it is a materially different finding from a cleartext page asset.
          {
            code: 'const db = "mongodb://u:p@db.acmecorp.io:27017";',
            errors: 1,
          },
          { code: 'const cache = "redis://cache.acmecorp.io:6379";', errors: 1 },
          { code: 'const drop = "ftp://files.acmecorp.io/incoming";', errors: 1 },
          { code: 'const sql = "mysql://u:p@db.acmecorp.io:3306/app";', errors: 1 },
          { code: 'const raw = "tcp://metrics.acmecorp.io:2003";', errors: 1 },
        ],
      },
    );
  });

  /*
   * ── REGRESSION: defect the rule corpus proved ─────────────────────────────
   * benchmarks/rule-corpus/browser-security__no-unencrypted-transmission/
   *
   * FP. The scheme was matched ANYWHERE in the string, so any sentence that
   * mentions one reported — including the rule's own advice. A URL's scheme is
   * at position 0 by definition, and every sibling in this family already
   * anchored (`/^http:\/\//i`, `startsWith('ws://')`); this rule was the only
   * one that did not, so the family disagreed about what counts as a URL.
   */
  describe('Corpus regression', () => {
    ruleTester.run(
      'regression - the scheme must START the value',
      noUnencryptedTransmission,
      {
        valid: [
          {
            code: `const HELP = 'Connection strings must not use redis:// or mysql://; use the TLS variants.';`,
          },
          { code: `const msg = 'Switch ftp:// endpoints to ftps:// before release.';` },
          // The remediation must not be reported as the defect: these START
          // with the insecure scheme's letters, and a prefix test that stopped
          // one character early would flag every correctly-secured DSN.
          { code: `const cache = 'rediss://cache.acmecorp.io:6379';` },
          { code: `const db = 'mongodb+srv://cluster.acmecorp.io/app';` },
          { code: `const files = 'ftps://files.acmecorp.io/incoming';` },
        ],
        invalid: [
          { code: `const M = 'mongodb://svc:pw@db.acmecorp.io:27017/orders';`, errors: 1 },
          // Schemes are ASCII case-insensitive; this rule lowercases before
          // matching and must keep doing so.
          { code: `const M = 'MONGODB://svc:pw@db.acmecorp.io:27017/orders';`, errors: 1 },
          // Leading whitespace is not prose.
          { code: `const M = '  redis://cache.acmecorp.io:6379';`, errors: 1 },
          // FN LOCK. A "the secure variant appears somewhere in the string"
          // exemption used to sit in the matcher, compensating for the
          // unanchored search. With the scheme anchored it was a pure false
          // negative: an attacker-supplied query parameter that merely
          // MENTIONED the secure scheme turned the rule off for that line.
          {
            code: `const u = 'http://evil.acmecorp.io/?next=https://ok.acmecorp.io';`,
            options: [{ insecureProtocols: ['http://'] }],
            errors: 1,
          },
          {
            code: `const M = 'mongodb://db.acmecorp.io/?docs=mongodb+srv://cluster';`,
            errors: 1,
          },
        ],
      },
    );
  });

  describe('Options Coverage', () => {
    ruleTester.run(
      'options - allowInTests still blocks non-localhost',
      noUnencryptedTransmission,
      {
        valid: [],
        invalid: [
          {
            code: 'const url = "http://staging.example.com";',
            filename: 'example.spec.ts',
            options: [{ allowInTests: true, insecureProtocols: ['http://'] }],
            errors: [
              {
                messageId: 'unencryptedTransmission',
                suggestions: [
                  {
                    messageId: 'useHttps',
                    output: 'const url = "https://staging.example.com";',
                  },
                ],
              },
            ],
          },
        ],
      },
    );

    ruleTester.run(
      'options - ignorePatterns skip insecure literal',
      noUnencryptedTransmission,
      {
        valid: [
          {
            code: 'const url = "http://internal.example.com";',
            options: [{ ignorePatterns: ['internal'] }],
          },
        ],
        invalid: [],
      },
    );

    ruleTester.run(
      'options - custom insecure protocols',
      noUnencryptedTransmission,
      {
        valid: [],
        invalid: [
          {
            code: 'const smtp = "smtp://mail.example.com";',
            options: [
              {
                insecureProtocols: ['smtp://'],
                secureAlternatives: { 'smtp://': 'smtps://' },
              },
            ],
            errors: [
              {
                messageId: 'unencryptedTransmission',
                suggestions: [
                  {
                    messageId: 'useHttps',
                    output: 'const smtp = "smtps://mail.example.com";',
                  },
                ],
              },
            ],
          },
        ],
      },
    );

    ruleTester.run(
      'options - template literal in test file skipped',
      noUnencryptedTransmission,
      {
        valid: [
          {
            // Without `insecureProtocols` this would now pass because `http://`
            // is not a default protocol any more — i.e. for the wrong reason,
            // testing nothing about `allowInTests`.
            code: 'const url = `http://${host}/api`;',
            filename: 'transport.test.ts',
            options: [{ allowInTests: true, insecureProtocols: ['http://'] }],
          },
        ],
        invalid: [],
      },
    );
  });

// A loopback broker in a spec file, on a non-web scheme.
//
// `allowInTests` promises "localhost in tests" — the docs say so, and the
// Options-coverage suite pins that a real host still reports under it. On
// non-web schemes that promise was not kept: `isNonTransmittingUrl` is
// scheme-gated on purpose, so `"redis://localhost:6379"` in `test/unit/**` was
// reachable by neither exemption. Twenty-one findings on moleculerjs/moleculer.
ruleTester.run(
  'no-unencrypted-transmission - loopback in tests, any scheme',
  noUnencryptedTransmission,
  {
    valid: [
      {
        code: 'let opts = "redis://localhost:6379";',
        filename: 'test/unit/cachers/redis.spec.js',
        options: [{ allowInTests: true }],
      },
      {
        code: 'var mockEnv = { storageURI: "mongodb://localhost:27017/nightscout" };',
        filename: 'tests/production-safety.test.js',
        options: [{ allowInTests: true }],
      },
    ],
    invalid: [
      // A REAL host in a test file still reports — the line the option was
      // always meant to hold.
      {
        code: 'let opts = "redis://cache.internal:6379";',
        filename: 'test/unit/cachers/redis.spec.js',
        options: [{ allowInTests: true }],
        errors: 1,
      },
      // Loopback on a non-web scheme still reports in PRODUCTION code, which is
      // the documented reason the scheme gate exists.
      {
        code: 'let opts = "redis://localhost:6379";',
        filename: 'src/cachers/redis.js',
        options: [{ allowInTests: true }],
        errors: 1,
      },
      // And without the opt-in, nothing changes.
      {
        code: 'let opts = "redis://localhost:6379";',
        filename: 'test/unit/cachers/redis.spec.js',
        errors: 1,
      },
    ],
  },
);
});
