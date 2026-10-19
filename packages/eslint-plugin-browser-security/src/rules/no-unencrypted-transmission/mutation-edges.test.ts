/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-10-18).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnencryptedTransmission } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run(
  'no-unencrypted-transmission (mutation edges)',
  noUnencryptedTransmission,
  {
    valid: [
      {
        name: 'a scheme passed to startsWith is inspection, not transmission',
        code: "if (url.startsWith('redis://')) useRedis();",
      },
      {
        name: 'a scheme compared with === is inspection, not transmission',
        code: "if (scheme === 'redis://') useRedis();",
      },
      {
        name: 'the search operand of replace is inspection',
        code: "const secure = url.replace('ftp://', 'ftps://');",
      },
      {
        name: 'an RFC 2606 reserved host never resolves, whatever the scheme',
        code: "const r = 'redis://example.com:6379';",
      },
      {
        name: 'ignorePatterns exempts a matching literal',
        code: "const r = 'redis://cache.internal.acme-corp.io:6379';",
        options: [{ ignorePatterns: ['internal\\.acme-corp'] }],
      },
      {
        name: 'an XML namespace is exempt when http:// is opted in',
        code: "const ns = 'http://www.w3.org/2000/svg';",
        options: [{ insecureProtocols: ['http://'] }],
      },
    ],
    invalid: [
      {
        name: 'a scheme concatenated into a URL is transmission, not a comparison',
        code: "const u = 'redis://' + host;",
        errors: [
          {
            messageId: 'unencryptedTransmission',
            suggestions: [
              {
                messageId: 'useHttps',
                output: 'const u = "rediss://" + host;',
              },
            ],
          },
        ],
      },
      {
        name: 'the replacement operand of replace is a destination',
        code: "const u = url.replace(/^ftps:/, 'ftp://files.acme-corp.io');",
        errors: [
          {
            messageId: 'unencryptedTransmission',
            suggestions: [
              {
                messageId: 'useHttps',
                output:
                  'const u = url.replace(/^ftps:/, "ftps://files.acme-corp.io");',
              },
            ],
          },
        ],
      },
      {
        name: 'ignorePatterns leaves a non-matching literal reported',
        code: "const r = 'redis://cache.acme-corp.io:6379';",
        options: [{ ignorePatterns: ['internal\\.acme-corp'] }],
        errors: [
          {
            messageId: 'unencryptedTransmission',
            suggestions: [
              {
                messageId: 'useHttps',
                output: 'const r = "rediss://cache.acme-corp.io:6379";',
              },
            ],
          },
        ],
      },
    ],
  },
);
