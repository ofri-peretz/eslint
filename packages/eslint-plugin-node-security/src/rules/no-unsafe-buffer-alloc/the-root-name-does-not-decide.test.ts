/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A peer-controlled allocation size is peer-controlled whatever the parameter
 * is called.
 *
 * `readsWire` recognised a request by the root identifier's SPELLING, against
 * `REQUEST_ROOTS = ['req', 'request', 'ctx', 'event']`. Every other link in the
 * chain was already structural, so the rename probe found the seam
 * immediately: rename the handler's parameter and 18 true positives went
 * silent, with `.query.capacity` still sitting in plain sight one link up.
 *
 *     function reserve(req)  { … Number(req.query.capacity)  … }   reported
 *     function foo3(foo2)    { … Number(foo2.query.capacity) … }   SILENT
 *
 * Nothing about the second is safer. `(inbound, outbound)` is somebody's house
 * style, and `(request: Request, response: Response)` — TypeScript's own
 * convention — destructures to whatever the handler wants. The list could only
 * ever be right about codebases that share our habits.
 *
 * The fix asks `readsRequestShape` before walking to the root: is this a read
 * of `.query` / `.params` / `.headers` / `.cookies` / `.body`, or the Lambda
 * spellings, off a binding that ARRIVED as a parameter. The name arm stays for
 * the wire-decoder vocabulary it was actually built for (`chunk`, `payload`,
 * `frame`), which is a different question and a different list.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noUnsafeBufferAlloc } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-unsafe-buffer-alloc — the root name does not decide',
  noUnsafeBufferAlloc,
  {
    valid: [
      // ── the vocabulary REPLACES, it does not extend ────────────────────
      //
      // A project whose `message` is a log line, not a socket frame. Under the
      // default this reports on the word alone; passing a narrower list has to
      // be able to turn it off, or the option is decoration.
      {
        code: `function f(message) { return Buffer.alloc(message.length); }`,
        options: [{ wireNames: ['chunk'] }],
      },
      // The empty list is the strongest statement a consumer can make, and it
      // has to be honoured: no name is wire data here.
      {
        code: `function f(payload) { return Buffer.alloc(payload.length); }`,
        options: [{ wireNames: [] }],
      },
      // `requestRootNames` replaces too, and the empty list is honoured:
      // `event` is a default root, and a project where `event` is a DOM event
      // rather than a Lambda payload can say so.
      {
        code: `function f(event) { return Buffer.alloc(event.length); }`,
        options: [{ requestRootNames: [], wireNames: [] }],
      },

      // Replacing sizeNames with a list that excludes `capacity` stops the
      // size reading as a count at all.
      {
        code: `function f(chunk) { const capacity = chunk.readUInt32BE(0); return Buffer.alloc(capacity); }`,
        options: [{ sizeNames: ['length'], wireNames: [] }],
      },

      // A member read that is not request-shaped. `cfg.size` is somebody's own
      // configuration object and always was.
      `function f(cfg) { return Buffer.alloc(cfg.size); }`,

      // Request-SHAPED, but the root is a module-local object rather than a
      // parameter. This is the case the parameter requirement exists for: a
      // literal `{ query: { n: 1 } }` declared in this file is not a peer.
      `const o = { query: { n: 1 } };
       export const b = Buffer.alloc(o.query.n);`,

      // No peer anywhere near the size.
      `const N = 64; export const b = Buffer.alloc(N);`,
    ],
    invalid: [
      // Replacement widens as well as narrows. `sock` is in no default list —
      // silent out of the box — and a project that names its socket buffer
      // that way can make the rule see it. An option that could only ever
      // remove behaviour would be a mute button, not a vocabulary.
      {
        code: `function f(sock) { return Buffer.alloc(sock.length); }`,
        options: [{ requestRootNames: ['sock'] }],
        errors: 1,
      },
      // The same three under the DEFAULT vocabulary. Without these the `valid`
      // cases above would pass for the wrong reason — a rule that never
      // reported them would satisfy the option test just as well.
      { code: `function f(message) { return Buffer.alloc(message.length); }`, errors: 1 },
      { code: `function f(payload) { return Buffer.alloc(payload.length); }`, errors: 1 },
      {
        code: `function f(chunk) { const capacity = chunk.readUInt32BE(0); return Buffer.alloc(capacity); }`,
        errors: 1,
      },

      // The shape the probe renamed. Reported before the fix only because the
      // parameter happened to be spelled `req`.
      {
        code: `function reserve(req) {
                 let capacity = 1024;
                 if (req.query.capacity) { capacity = Number(req.query.capacity); }
                 return Buffer.allocUnsafe(capacity);
               }`,
        errors: 2,
      },
      // The same function with every binding renamed. This is the assertion
      // that fails if the structural arm is removed.
      {
        code: `function foo3(foo2) {
                 let foo1 = 1024;
                 if (foo2.query.capacity) { foo1 = Number(foo2.query.capacity); }
                 return Buffer.allocUnsafe(foo1);
               }`,
        errors: 2,
      },
      // Koa nests the real request under `ctx.request`, and here the root is
      // not even spelled `ctx`. Two reasons the old list could not see it.
      {
        code: `function h(inbound) {
                 const n = Number(inbound.request.query.size);
                 return Buffer.allocUnsafe(n);
               }`,
        errors: 2,
      },
      // Lambda's spelling of the same thing, root renamed.
      {
        code: `export const handler = async (evt) => {
                 const n = Number(evt.queryStringParameters.size);
                 return Buffer.allocUnsafe(n);
               };`,
        errors: 2,
      },
    ],
  },
);
