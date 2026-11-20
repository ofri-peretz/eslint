/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `client.eval(script, …)` runs Lua on the Redis server. It compiles no
 * JavaScript here.
 *
 * Hand-verification run 2026-08-24 against animir/node-rate-limiter-flexible —
 * 3,580 stars, and this was the ONLY finding in the whole repository under
 * `recommended`. `lib/RateLimiterRedis.js:155`:
 *
 *   this.client.eval(this._incrTtlLuaScript, 1, rlKey, points, …)
 *
 * The script is a hardcoded class field. Reported as CWE-502 unsafe
 * deserialization because the method is called `eval`.
 *
 * (Historical note: `eval` and `Function` are now excluded from this rule
 * altogether, see the end of this file.) The Identifier branch restricted them to
 * globals — a locally-defined `function Function()` is not the constructor. The
 * member branch did not, so `.eval` on any receiver was a sink. Redis is the
 * common case; mathjs, sequelize and every embedded-language client have the
 * same shape.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noUnsafeDeserialization } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-unsafe-deserialization — a Redis EVAL is not a JavaScript eval',
  noUnsafeDeserialization,
  {
    valid: [
      // The corpus shape, both call styles the library uses.
      `this.client.eval(this._incrTtlLuaScript, 1, rlKey, points, secDuration, cb);`,
      `client.eval(script, { keys: [rlKey], arguments: [String(points)] });`,
      // A PARAMETER named `window` is not the global object — review's case.
      `function run(window) { window.eval(req.body.code); }`,
      `const window = getSandbox(); window.eval(req.body.code);`,
      // The same argument for other embedded languages.
      `redis.eval(LUA_TOKEN_BUCKET, 1, key);`,
      `mathEngine.eval('1 + 1');`,
    ],
    invalid: [
      // A member `deserialize` is still dangerous on any receiver; only the
      // eval-family names are excluded.
      {
        code: `serializer.deserialize(req.body.payload);`,
        errors: 1,
      },
    ],
  },
);

// The global-object spellings and the bare form are code injection, owned by
// node-security's detect-eval-with-expression. This rule stays silent on them
// so one call is one finding.
ruleTester.run(
  'no-unsafe-deserialization: global eval is owned by detect-eval-with-expression',
  noUnsafeDeserialization,
  {
    valid: [
      {
        name: 'window.eval is reported by the owner rule only',
        code: `window.eval(req.body.code);`,
      },
      {
        name: 'globalThis.eval is reported by the owner rule only',
        code: `globalThis.eval(req.query.payload);`,
      },
      {
        name: 'a bare eval is reported by the owner rule only',
        code: `eval(req.body.code);`,
      },
    ],
    invalid: [],
  },
);
