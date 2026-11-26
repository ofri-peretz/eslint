/**
 * @fileoverview Tests for no-error-detail-leak
 *
 * The sink is structural: the callback or the call object a gRPC handler was
 * given (handler = method of the object passed to `.addService`). The source
 * is a caught error, by binding: a `catch (e)` parameter or the parameter of a
 * `.catch(e => …)` callback. No name is read.
 */

import fs from 'node:fs';
import path from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';

import { noErrorDetailLeak } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const corpus = (file: string): string =>
  fs.readFileSync(
    path.resolve(__dirname, '../../../../../benchmarks/corpus/CWE-209', file),
    'utf8',
  );

/** A unary handler whose body is `body`. */
const unary = (body: string): string =>
  `server.addService(svc, {\n  Get(call, cb) {\n    ${body}\n  },\n});`;

const ERR = [{ messageId: 'errorDetailLeak' as const }];

ruleTester.run('no-error-detail-leak', noErrorDetailLeak, {
  valid: [
    {
      name: 'lab grpc-3: fixed error details on a streaming call',
      // @found ofri-peretz/security-research:protocol-ctf/challenges/grpc/grpc-3/server.mjs
      code: corpus('safe/grpc-3-lab-server.js'),
    },
    {
      name: 'a generic message, the real error logged server-side',
      code: unary(
        `try { work(); } catch (e) { log(e.stack); cb({ code: 13, details: 'internal error' }); }`,
      ),
    },
    {
      name: 'the caught error passed as is: gRPC sends its message, which the app may have written for the client',
      code: unary(`try { work(); } catch (e) { cb(e); }`),
    },
    {
      name: 'a field of the error that is not its message or stack',
      code: unary(
        `try { work(); } catch (e) { cb({ code: e.code, details: 'failed' }); }`,
      ),
    },
    {
      name: 'details from the request, not from an error',
      code: unary(
        `cb({ code: 3, details: \`unknown id \${call.request.id}\` });`,
      ),
    },
    {
      name: 'a variable that is not a caught error',
      code: unary(`const e = new Error('x'); cb({ details: e.message });`),
    },
    {
      name: 'a callback that is not the handler’s',
      code: unary(`try { work(); } catch (e) { other({ details: e.stack }); }`),
    },
    {
      name: 'an emit of another event',
      code: unary(
        `try { work(); } catch (e) { call.emit('data', { details: e.stack }); }`,
      ),
    },
    {
      name: 'an object whose details cannot be read',
      code: unary(`try { work(); } catch (e) { cb({ ...e }); }`),
    },
    {
      name: 'not a handler: the object goes to something other than addService',
      code: `router.register(svc, { Get(call, cb) { try { w(); } catch (e) { cb({ details: e.stack }); } } });`,
    },
    {
      name: 'a parameter of an ordinary callback is not a caught error',
      code: unary(`items.forEach((e) => cb({ details: e.message }));`),
    },
    {
      name: 'cb called with no argument',
      code: unary(`cb();`),
    },
    {
      name: 'a reassigned binding is not followed',
      code: unary(
        `try { work(); } catch (e) { let m = e.stack; m = 'x'; cb({ details: m }); }`,
      ),
    },
    {
      name: 'a const cycle ends, it does not loop',
      code: unary(
        `try { work(); } catch (e) { const a = b; const b = a; cb({ details: a }); }`,
      ),
    },
    {
      name: 'arithmetic on the error is not its text',
      code: unary(
        `try { work(); } catch (e) { cb({ details: e.stack - 1 }); }`,
      ),
    },
  ],
  invalid: [
    {
      name: 'the stack in the details of a unary callback',
      code: unary(
        `try { work(); } catch (err) { cb({ code: 13, details: err.stack }); }`,
      ),
      errors: ERR,
    },
    {
      name: 'the message, via String() and a template',
      code: unary(
        `try { work(); } catch (err) { cb({ code: 13, details: \`failed: \${String(err)}\` }); }`,
      ),
      errors: ERR,
    },
    {
      name: 'the error itself as details, through a const object',
      code: unary(
        `try { work(); } catch (err) { const out = { code: 13, details: err }; cb(out); }`,
      ),
      errors: ERR,
    },
    {
      name: 'a promise .catch, concatenation and toString',
      code: unary(
        `load().then((r) => cb(null, r)).catch((err) => cb({ code: 13, details: 'db: ' + err.toString() }));`,
      ),
      errors: ERR,
    },
    {
      name: 'call.emit("error") on a streaming handler',
      code: `server.addService(svc, {\n  List(call) {\n    try { work(); } catch (e) { call.emit('error', { code: 13, details: e.message || 'x' }); }\n  },\n});`,
      errors: ERR,
    },
    {
      name: 'call.destroy with an error object',
      code: `server.addService(svc, {\n  List(call) {\n    try { work(); } catch (e) { call.destroy({ code: 13, message: ok ? e.stack : '' }); }\n  },\n});`,
      errors: ERR,
    },
    {
      name: 'through a const holding the stack, and an async handler',
      code: `server.addService(svc, {\n  async Get(call, callback) {\n    try { await work(); } catch (e) { const trace = e.stack; callback({ code: 13, details: trace }); }\n  },\n});`,
      errors: ERR,
    },
    {
      name: 'the error as the fallback of ??',
      code: unary(
        `try { work(); } catch (e) { cb({ details: known ?? e.message }); }`,
      ),
      errors: ERR,
    },
    {
      name: 'the error in the else arm of a ternary',
      code: unary(
        `try { work(); } catch (e) { cb({ details: safe ? 'failed' : e.stack }); }`,
      ),
      errors: ERR,
    },
  ],
});
