/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A catch that rethrows everything but one class of error does not swallow.
 *
 * Measured on github-aws-runners/terraform-aws-github-runner
 * (`termination-watcher/src/registration-janitor.ts:283`):
 *
 *   try { await client.actions.deleteSelfHostedRunnerFromOrg(...); }
 *   catch (error) { if (!isNotFound(error)) throw error; }
 *
 * A 404 means the runner is already gone, which is the outcome the delete wanted;
 * every other error is thrown. The rule only counted a `throw` that was a
 * top-level statement of the catch block, so the same code with the rethrow one
 * `if` deeper read as a catch that records nothing and propagates nothing.
 *
 * What counts: a `throw` reachable through `if` statements whose tests are the
 * NEGATION of something about the caught error (`!pred(e)`, `e.code !== K`, `!(e
 * instanceof K)`, joined by `&&`), so everything the test does not name is
 * thrown. The opposite polarity (`if (e.code === 'X') throw e`) throws one
 * class and swallows the rest, and a test that never reads the error says
 * nothing about it.
 */
import { describe, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noErrorSwallowing } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester();

const asLambda = (code: string): string =>
  `import type { Handler } from 'aws-lambda';\n${code}`;

const swallowed = [{ messageId: 'emptyCatchBlock' as const }];

ruleTester.run('no-error-swallowing (conditional rethrow)', noErrorSwallowing, {
  valid: [
    {
      name: 'rethrows unless the predicate says not found',
      code: asLambda(
        `try { await del(); } catch (error) { if (!isNotFound(error)) throw error; }`,
      ),
    },
    {
      name: 'rethrows unless the error code is the expected one, in a block',
      code: asLambda(
        `try { await del(); } catch (e) { if (e.code !== 'ENOENT') { throw e; } }`,
      ),
    },
    {
      name: 'rethrows unless the error is an instance of the expected class',
      code: asLambda(
        `try { await del(); } catch (err) { if (!(err instanceof NotFoundError)) throw err; }`,
      ),
    },
    {
      name: 'rethrows unless the error is one of two expected classes',
      code: asLambda(
        `try { await del(); } catch (err) { if (!isNotFound(err) && !isConflict(err)) throw err; }`,
      ),
    },
    {
      name: 'the rethrow sits one else-if deeper',
      code: asLambda(`try { await del(); } catch (err) {
        if (isNotFound(err)) {
          cleanup();
        } else if (err.status !== 409) {
          throw err;
        }
      }`),
    },
  ],
  invalid: [
    {
      name: 'a rethrow gated on something that is not the error',
      code: asLambda(
        `try { await del(); } catch (error) { if (process.env.DEBUG) throw error; }`,
      ),
      errors: swallowed,
    },
    {
      name: 'the opposite polarity throws one class and swallows the rest',
      code: asLambda(
        `try { await del(); } catch (error) { if (isFatal(error)) throw error; }`,
      ),
      errors: swallowed,
    },
    {
      name: 'an equality test throws one code and swallows the rest',
      code: asLambda(
        `try { await del(); } catch (error) { if (error.code === 'EFATAL') throw error; }`,
      ),
      errors: swallowed,
    },
    {
      name: 'one negated test joined to an unrelated one is not a classification of the error',
      code: asLambda(
        `try { await del(); } catch (error) { if (!isNotFound(error) && process.env.DEBUG) throw error; }`,
      ),
      errors: swallowed,
    },
    {
      name: 'a throw inside a callback never runs in the catch',
      code: asLambda(
        `try { await del(); } catch (error) { if (!isNotFound(error)) { later(() => { throw error; }); } }`,
      ),
      errors: swallowed,
    },
    {
      name: 'a negated test with nothing thrown still swallows',
      code: asLambda(
        `try { await del(); } catch (error) { if (!isNotFound(error)) { cleanup(); } }`,
      ),
      errors: swallowed,
    },
  ],
});
