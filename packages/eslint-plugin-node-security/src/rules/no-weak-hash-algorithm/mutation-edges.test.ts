/**
 * no-weak-hash-algorithm — the edges Stryker found unpinned.
 *
 * Each case states one claim about where the rule reads a digest's purpose:
 * the name it is stored under (object keys and class fields alike), what is
 * hashed, and what a local helper calls.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noWeakHashAlgorithm } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const SWEEP = [{ reportUnclassifiedHashes: true }];

/** One createHash('md5') report, with the three rewrites of `"md5"`. */
function weakMd5(code: string) {
  return [
    {
      messageId: 'weakHashAlgorithm' as const,
      data: { algorithm: 'MD5', replacement: 'sha256' },
      suggestions: (['sha256', 'sha512', 'sha3-256'] as const).map(
        (algorithm, index) => ({
          messageId: (['useSha256', 'useSha512', 'useSha3'] as const)[index],
          output: code.replace("'md5'", `"${algorithm}"`),
        }),
      ),
    },
  ];
}

const CLASS_TOKEN =
  "class Session { token = createHash('md5').update(seed).digest('hex'); }";
const PRIVATE_TOKEN =
  "class Session { #token = createHash('md5').update(seed).digest('hex'); }";

describe('no-weak-hash-algorithm mutation edges', () => {
  ruleTester.run('no-weak-hash-algorithm', noWeakHashAlgorithm, {
    valid: [
      {
        name: 'a shard picked by md5 of an id is not a security use of what the shard is asked for',
        code: 'shards[md5(userId)].get(sessionToken);',
      },
      {
        name: 'BUG: a class field named etag is an identifier, not a security control',
        code: "class Asset { etag = createHash('md5').update(body).digest('hex'); }",
        options: SWEEP,
      },
      {
        name: 'BUG: a private class field named etag is an identifier',
        code: "class Asset { #etag = createHash('md5').update(body).digest('hex'); }",
        options: SWEEP,
      },
      {
        name: 'BUG: a quoted computed key names the same property as the bare one',
        code: "const meta = { ['cache-key']: createHash('md5').update(body).digest('hex') };",
        options: SWEEP,
      },
      {
        name: 'a template-literal computed key names the same property as the bare one',
        code: "const meta = { [`cache-key`]: createHash('md5').update(body).digest('hex') };",
        options: SWEEP,
      },
    ],
    invalid: [
      {
        name: 'BUG: a class field named token stores the digest under a security name',
        code: CLASS_TOKEN,
        errors: weakMd5(CLASS_TOKEN),
      },
      {
        name: 'BUG: a private class field named token stores the digest under a security name',
        code: PRIVATE_TOKEN,
        errors: weakMd5(PRIVATE_TOKEN),
      },
      {
        name: 'a curried call inside a local sha1 helper is not createHmac',
        code: [
          'function sha1(data) { return pickHasher("sha1")(data); }',
          'const sessionToken = sha1(secret);',
        ].join('\n'),
        errors: [
          {
            messageId: 'weakHashAlgorithm',
            data: { algorithm: 'SHA-1', replacement: 'sha256' },
            suggestions: [],
          },
        ],
      },
    ],
  });
});
