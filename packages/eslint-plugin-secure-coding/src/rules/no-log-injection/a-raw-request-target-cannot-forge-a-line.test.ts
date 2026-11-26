/**
 * The request target as it came off the wire cannot hold a literal CR or LF:
 * Node's HTTP parser rejects the request, and a percent-encoded `%0d%0a` stays
 * encoded in `req.url`. So `` `no tracker found: ${request.url}` `` cannot
 * forge a log record. Seen on cal.com (`throttler-guard.ts`) and Teable
 * (`oauth-token-exception.filter.ts`).
 *
 * The decoded and parsed parts of a request (`query`, `params`, `body`,
 * `headers`) and anything that merely ends in `.url` below them keep reporting.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noLogInjection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const report = [{ messageId: 'logInjection' as const }];

describe('no-log-injection: the raw request target', () => {
  ruleTester.run('raw target', noLogInjection, {
    valid: [
      {
        name: 'cal.com: request.url in a message',
        code: 'this.logger.verbose(`no tracker found: ${request.url}`);',
      },
      {
        name: 'Teable: method and url in a message',
        code: 'logger.error(`[OAuth] ${req.method} ${req.url} -> ${status}`);',
      },
      {
        name: 'a concatenated req.url',
        code: "logger.info('GET ' + req.url);",
      },
      {
        name: 'Koa ctx.path',
        code: 'logger.info(`served ${ctx.path}`);',
      },
      {
        name: 'a local bound to req.url, one hop',
        code: 'const target = req.url; logger.info(`served ${target}`);',
      },
    ],
    invalid: [
      {
        name: 'a query value is decoded and can hold a newline',
        code: 'logger.info(`search ${req.query.q}`);',
        errors: report,
      },
      {
        name: 'a url taken from the body is not the request target',
        code: 'logger.info(`fetching ${req.body.url}`);',
        errors: report,
      },
      {
        name: 'a path param is decoded',
        code: 'logger.info(`file ${req.params.path}`);',
        errors: report,
      },
      {
        name: 'a header named url is not the request target',
        code: 'logger.info(`from ${req.headers.url}`);',
        errors: report,
      },
      {
        name: 'a url on an event root is not an HTTP request target',
        code: 'logger.info(`hook ${event.url}`);',
        errors: report,
      },
      {
        name: 'a url on a message root is not an HTTP request target',
        code: 'logger.info(`hook ${message.url}`);',
        errors: report,
      },
    ],
  });
});
