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
 * The Identifier branch of this rule already restricts `eval` and `Function` to
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
      // The same argument for other embedded languages.
      `redis.eval(LUA_TOKEN_BUCKET, 1, key);`,
      `mathEngine.eval('1 + 1');`,
    ],
    invalid: [
      // On a global receiver it IS the JavaScript sink.
      {
        code: `window.eval(req.body.code);`,
        errors: 1,
      },
      {
        // Tainted argument, as the rule's untrusted-input gate requires — the
        // receiver is the only thing this change touches.
        code: `globalThis.eval(req.query.payload);`,
        errors: 1,
      },
      // And the bare form is unchanged.
      {
        code: `eval(req.body.code);`,
        errors: 1,
      },
      // A member `deserialize` is still dangerous on any receiver — only
      // `eval` and `Function` are global-only.
      {
        code: `serializer.deserialize(req.body.payload);`,
        errors: 1,
      },
    ],
  },
);
