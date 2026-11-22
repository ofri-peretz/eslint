/**
 * A test file registering throwaway routes is not designing a REST API.
 *
 * Found by linting honojs/hono at 75ff8e3: 517 findings, every one in a
 * `*.test.ts`, e.g. `src/adapter/aws-lambda/handler.test.ts:531`
 *
 *   app.get('/multi-cookie', (c) => { ... })
 *
 * The test needs a route to exercise the adapter, and names it for the case
 * under test (`/multi-cookie`, `/error`, `/upload`). "Resource should be
 * plural" is advice for the person who owns the public surface, and a fixture
 * app has none. The same call in application source still reports.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { enforceRestConventions } from '../rules/enforce-rest-conventions';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const violation = [{ messageId: 'restConventionViolation' as const }];

describe('enforce-rest-conventions - test files', () => {
  ruleTester.run('fixture routes in test files', enforceRestConventions, {
    valid: [
      {
        name: 'a route named for the case under test, in a .test.ts file',
        code: "app.get('/multi-cookie', (c) => c.text('ok'))",
        filename: 'handler.test.ts',
      },
      {
        name: 'a .spec.mts file',
        code: "app.post('/upload', handler)",
        filename: 'src/adapter/upload.spec.mts',
      },
      {
        name: 'a file inside __tests__',
        code: "router.get('/error', handler)",
        filename: 'src/__tests__/routes.ts',
      },
    ],
    invalid: [
      {
        name: 'the same call in application source still reports',
        code: "app.get('/multi-cookie', handler)",
        filename: 'src/routes.ts',
        errors: violation,
      },
      {
        name: 'a source file whose name merely contains "test" still reports',
        code: "app.get('/contest', handler)",
        filename: 'src/contest-routes.ts',
        errors: violation,
      },
      {
        name: 'a directory named test (not __tests__) does not exempt source',
        code: "app.delete('/session', handler)",
        filename: 'src/test/routes.ts',
        errors: violation,
      },
    ],
  });
});
