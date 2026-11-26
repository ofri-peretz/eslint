/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noTimingUnsafeCompare } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

/**
 * Found scanning Wiki.js, Trigger.dev and Docmost (batch 6, 2026-11-26):
 *
 * - an `If-None-Match` header compared with the etag the same handler sends
 *   back in `ETag` (a SHA-1 of the asset, so it read as a crypto secret);
 * - a record id whose name carries a secret word (`localAuthId`, `tokenId`);
 * - a NestJS `@Body()` field compared with the caller's own session id, where
 *   the decorated parameter did not read as the request, so only one side was
 *   untrusted.
 *
 * The same `@Body()` recognition is what makes a body field against a stored
 * reset token report now; it used to read as two server values.
 */
ruleTester.run(
  'an etag, a record id or the callers own value is not a secret',
  noTimingUnsafeCompare,
  {
    valid: [
      {
        name: 'If-None-Match against the etag the handler sends back',
        code: `
          import crypto from 'crypto';
          app.get('/a', async (req, reply) => {
            const asset = await load();
            const etag = '"' + crypto.createHash('sha1').update(asset.data).digest('hex') + '"';
            reply.header('ETag', etag);
            if (req.headers['if-none-match'] === etag) return reply.code(304).send();
          });
        `,
      },
      {
        name: 'If-Match read through Fetch headers.get, any case',
        code: `
          import crypto from 'crypto';
          async function put(request) {
            const digest = crypto.createHash('sha256').update(await load()).digest('hex');
            return request.headers.get('If-Match') !== digest;
          }
        `,
      },
      {
        name: 'If-None-Match read with Express req.get through a const',
        code: `
          import crypto from 'crypto';
          function get(req, res) {
            const sent = req.get('if-none-match');
            const hash = crypto.createHash('md5').update(body).digest('hex');
            return sent === hash;
          }
        `,
      },
      {
        name: 'the header on the right, a digest of the request body on the left',
        code: `
          import { createHash } from 'crypto';
          function get(req) {
            const hash = createHash('sha1').update(req.body).digest('hex');
            return hash === req.headers['if-none-match'];
          }
        `,
      },
      {
        name: 'a request held on this, read through its headers getter',
        code: `
          import crypto from 'crypto';
          function get(req) {
            const hash = crypto.createHash('sha1').update(req.body).digest('hex');
            return this.request.headers.get('If-None-Match') === hash;
          }
        `,
      },
      {
        name: 'an alias of a content digest is still the etag',
        code: `
          import crypto from 'crypto';
          function get(req) {
            const digest = crypto.createHash('sha1').update(req.body).digest('hex');
            const hash = digest;
            return req.headers['if-none-match'] === hash;
          }
        `,
      },
      {
        name: 'a strategy id against the built-in local auth id',
        code: `
          app.delete('/s/:strategyId', async (req, reply) => {
            const strategy = await models.authentication.getStrategyById(req.params.strategyId);
            if (strategy.id === WIKI.data.systemIds.localAuthId) return reply.conflict('x');
          });
        `,
      },
      {
        name: 'a token row id against the identity it was issued to',
        code: `
          async function gate(identity, request, context) {
            const result = await rbac.authenticatePat(request, context);
            return result.userId === identity.userId && result.tokenId === identity.tokenId;
          }
        `,
      },
      {
        name: 'a @Body() session id against the callers own session id',
        code: `
          import { Body, Req, Controller, Post } from '@nestjs/common';
          @Controller()
          class SessionController {
            @Post('revoke')
            async revokeSession(@Body() dto: RevokeSessionDto, @Req() req: FastifyRequest) {
              const currentSessionId = (req.raw as any).sessionId;
              if (dto.sessionId === currentSessionId) throw new Error('use logout');
            }
          }
        `,
      },
      {
        name: 'a Body decorator from no known framework is not the request',
        code: `
          import { Body } from './decorators';
          class C {
            reset(@Body() dto: Dto, user: User) {
              return dto.token === user.resetToken;
            }
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'a header other than a conditional one still reports against a digest',
        code: `
          import crypto from 'crypto';
          function hook(req) {
            const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
            return req.headers['x-signature'] === expected;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'an If-None-Match name that is not a header read still reports',
        code: `
          import crypto from 'crypto';
          function hook(req) {
            const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
            return req.query['if-none-match'] === expected;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a getter the rule cannot name is not a header read',
        code: `
          import crypto from 'crypto';
          function hook(req, getter) {
            const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
            return req[getter]('if-none-match') === expected;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a header read by a computed name is not a conditional header',
        code: `
          import crypto from 'crypto';
          function hook(req, name) {
            const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
            return req.headers[name] === expected;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a getter called with a computed header name still reports',
        code: `
          import crypto from 'crypto';
          function hook(req, name) {
            const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
            return req.get(name) === expected;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a signature header with a fallback is not a conditional header',
        code: `
          import crypto from 'crypto';
          function hook(req) {
            const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
            return expected === (req.headers['x-hub-signature-256'] || '');
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a pattern configured as id keeps every id a secret',
        code: 'function f(req) { return req.body.tokenId === store.apiTokenId; }',
        options: [{ secretPatterns: ['token', 'id'] }],
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'If-None-Match against a value named as a stored secret still reports',
        code: "function f(req, storedToken) { return req.headers['if-none-match'] === storedToken; }",
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a stored secret on the left against If-None-Match still reports',
        code: "function f(req, storedToken) { return storedToken !== req.get('if-none-match'); }",
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a configured secret against If-None-Match still reports',
        code: "function f(req) { return req.headers['if-none-match'] === process.env.API_SECRET; }",
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a binding reassigned after the header read is not the header',
        code: `
          import crypto from 'crypto';
          function hook(req) {
            const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
            let sent = req.headers['if-none-match'];
            sent = req.body.signature;
            return sent === expected;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a keyed HMAC named as a digest is not an entity tag',
        code: `
          import crypto from 'crypto';
          function hook(req) {
            const digest = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
            return req.headers['if-none-match'] === digest;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a hash binding that only aliases another name is not followed',
        code: "function f(req, storedHash) { const hash = storedHash; return req.headers['if-none-match'] === hash; }",
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a cache getter on this is not a request header getter',
        code: `
          import crypto from 'crypto';
          function get(req) {
            const hash = crypto.createHash('sha1').update(req.body).digest('hex');
            return this.cache.get('if-match') === hash;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'two hash bindings that initialise each other are not a digest',
        code: "function f(req) { let a = b; let b = a; return req.headers['if-none-match'] === a; }",
        options: [{ secretPatterns: ['a'] }],
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a Map get is not a request header getter',
        code: `
          import crypto from 'crypto';
          function hook(req, credentials) {
            const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
            return credentials.get('if-match') === expected;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a @Body() parameter replaced by a stored record is server data',
        code: `
          import { Body, Controller, Post } from '@nestjs/common';
          @Controller()
          class AuthController {
            @Post('reset')
            async reset(@Body() dto: ResetDto, @Req() req: Request) {
              dto = this.stored;
              return dto.token === req.body.token;
            }
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a session id is still a secret although it ends in id',
        code: 'function f(req) { return req.headers.cookie === store.localSessionId; }',
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a record id against a real secret still reports',
        code: 'function f(req) { return req.body.tokenId === store.apiToken; }',
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a @Body() token against a stored reset token now reports',
        code: `
          import { Body, Controller, Post } from '@nestjs/common';
          @Controller()
          class AuthController {
            @Post('reset')
            async reset(@Body() dto: ResetDto) {
              const user = await this.users.findByEmail(dto.email);
              if (dto.token !== user.resetToken) throw new Error('bad token');
            }
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
    ],
  },
);
