---
'eslint-plugin-node-security': minor
'oxlint-plugin-node-security': minor
---

feat(node-security): `require-emitter-error-handler`, and `require-stream-error-handler` reads `Readable.fromWeb`

New rule `require-emitter-error-handler` (CWE-248). A `ClientRequest` or `ChildProcess` that emits `'error'` with no listener throws from the event loop, and a `try/catch` around the call or the `await` cannot catch it. The rule reports the value returned by `http.request`, `http.get`, `https.request`, `https.get`, `child_process.spawn` and `child_process.fork`, resolved by import provenance (default, namespace and named imports, aliases, `node:` specifiers, `require`), when no `.on('error')`, `.once('error')` or `.addListener('error')` is registered on it. Being the destination of `.pipe()` is not a listener. Two production crashes found on 2026-11-24 have this shape: parse-server's GraphQL file upload and Eleventy's `spawn('git', ...)` helper.

It stays silent when the emitter escapes (returned, stored, or passed to any function other than as a pipe destination, which includes `events.once`, `stream.pipeline` and `finished`; that is the rule's ceiling). `exec` and `execFile` are not in the table: Node attaches its own `'error'` listener inside both, so they cannot crash this way, with or without a callback. Promisified forms resolve to no module.

It is a separate rule, not an extension of `require-stream-error-handler`: that rule is triggered by a `.pipe()` and reads stream constructors by name, this one by the creation of an emitter resolved to its module, with or without a pipe. It is in `strict` and not in `recommended`; the corpus measurement a promotion needs has not been made.

`require-stream-error-handler`: `Readable.fromWeb(body).pipe(dest)` reported the destination and never the source, because `fromWeb` was not a stream constructor. `Readable.fromWeb`, `Writable.fromWeb` and `Duplex.fromWeb`, resolved to `node:stream`, now count, and the report lands on the stream that emits.
