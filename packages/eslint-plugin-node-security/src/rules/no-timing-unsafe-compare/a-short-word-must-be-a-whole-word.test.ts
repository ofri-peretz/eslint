/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A short secret word matches only as a whole word of the identifier.
 *
 * `token` is five letters, and five letters turn up inside other words:
 * `maxTokens` is a count of LLM tokens, not a credential. The MCP TypeScript
 * SDK's CLI host caps a sampling request's spend and compares the cap with
 * what the server asked for — two numbers, both from the request — and the
 * rule called it a timing oracle because `maxTokens` contains `Token`.
 *
 * Long patterns (six letters or more: `secret`, `password`, `apikey`) still
 * match anywhere, the same threshold `utils/names.ts#makeNameTest` uses: a
 * six-letter word inside another identifier is the secret it names
 * (`clientsecret`, `hashedpassword`), while `token`, `auth` and `hash` sit
 * inside `tokens`, `author` and `hashtag`.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noTimingUnsafeCompare } from './index';

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

describe('no-timing-unsafe-compare — a short word must be a whole word', () => {
  ruleTester.run('whole-word', noTimingUnsafeCompare, {
    valid: [
      {
        // @source modelcontextprotocol/typescript-sdk examples/cli-client/host/host.ts:397
        // @found real-source scan
        name: 'FP: maxTokens is a count of LLM tokens, and comparing two counts leaks nothing',
        code: `
          export function register(client, cap) {
            client.setRequestHandler('sampling/createMessage', async (request) => {
              const params = request.params;
              const grantedMaxTokens = Math.min(params.maxTokens, cap);
              const capNote = grantedMaxTokens === params.maxTokens ? '' : ' (capped)';
              return capNote;
            });
          }
        `,
      },
      {
        name: 'a plural is a different word: tokens is a list, not one secret',
        code: `
          app.post('/x', (req, res) => {
            const tokens = lookupAll();
            res.send(req.body.tokens === tokens);
          });
        `,
      },
      {
        name: 'a lowercase letter after an acronym continues it: JWTs is one word, not JWT',
        code: `
          app.post('/x', async (req, res) => {
            const issuedJWTs = await audit.count(req.query.day);
            res.send(req.body.expected === issuedJWTs);
          });
        `,
      },
      {
        name: 'an all-caps run with no separator is one word: MAXTOKENS does not contain TOKEN',
        code: `
          app.post('/x', async (req, res) => {
            const MAXTOKENS = await limits.read(req.query.plan);
            res.send(req.body.requested === MAXTOKENS);
          });
        `,
      },
    ],
    invalid: [
      {
        name: 'an acronym ends where the next capitalised word starts: storedJWTValue holds a JWT',
        code: `
          app.post('/x', async (req, res) => {
            const storedJWTValue = await sessions.read(req.cookies.sid);
            res.send(req.headers['x-jwt'] === storedJWTValue);
          });
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'the whole word still reports: a request token against a stored one',
        code: `
          app.post('/x', async (req, res) => {
            const stored = await db.getToken(req.params.id);
            res.send(req.body.token === stored);
          });
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a word between two camelCase boundaries still reports: accessTokenValue',
        code: `
          app.post('/x', async (req, res) => {
            const accessTokenValue = await sessions.read(req.cookies.sid);
            res.send(req.headers['x-access-token'] === accessTokenValue);
          });
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'authorization is a secret in its own right, not a substring of auth',
        code: `
          app.use(async (req, res, next) => {
            const expected = await vault.get('authorization');
            if (req.headers.authorization !== expected) return res.sendStatus(401);
            next();
          });
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a long pattern still matches inside a lowercase compound: clientsecret',
        code: `
          app.post('/x', async (req, res) => {
            const clientsecret = await store.secretFor(req.body.client_id);
            res.send(req.body.client_secret === clientsecret);
          });
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
    ],
  });
});
