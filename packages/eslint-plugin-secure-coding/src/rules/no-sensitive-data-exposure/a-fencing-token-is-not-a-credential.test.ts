/**
 * no-sensitive-data-exposure: a fencing token is a lock counter, not a
 * credential.
 *
 * nestjs/locks logs `lock.fencingToken` when a node takes leadership
 * (`leader-elections.service.ts:81`, `scheduled-jobs.service.ts:61`). A fencing
 * token is the increasing number a lock service hands each new holder so stale
 * holders can be refused; it cannot be replayed to authenticate as anyone. The
 * word `token` alone decided the finding. The invalid half keeps the exemption
 * to the compound: any other token, or a fencing name that also says secret,
 * still reports.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSensitiveDataExposure } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const exposure = [{ messageId: 'sensitiveDataExposure' as const }];

describe('no-sensitive-data-exposure - a fencing token is not a credential', () => {
  ruleTester.run('fencing and cancellation tokens', noSensitiveDataExposure, {
    valid: [
      {
        // @source nestjs/locks lib/services/leader-elections.service.ts:81
        // @found real-source scan
        name: 'FP: logging the fencing token of an acquired lock',
        code: 'class L { run(lock) { this.logger.log(`Leading "${this.key}" (fencing token ${lock.fencingToken})`); } }',
      },
      {
        // @found synthetic
        name: 'FP: the snake_case spelling',
        code: 'function f(row) { console.log(row.fencing_token); }',
      },
      {
        // @found synthetic
        name: 'FP: a cancellation token handed to a log',
        code: 'function f(cancellationToken) { logger.debug(cancellationToken); }',
      },
    ],
    invalid: [
      {
        name: 'an access token still reports',
        code: 'class L { run(lock) { this.logger.log(`Leading (${lock.accessToken})`); } }',
        errors: exposure,
      },
      {
        name: 'a fencing name that also names a secret still reports',
        code: 'function f(lock) { console.log(lock.fencingTokenSecret); }',
        errors: exposure,
      },
      {
        name: 'a token that merely follows the word fencing elsewhere still reports',
        code: 'function f(fencingAuthToken) { console.log(fencingAuthToken); }',
        errors: exposure,
      },
    ],
  });
});
