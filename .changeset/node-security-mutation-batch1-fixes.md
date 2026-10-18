---
'eslint-plugin-node-security': patch
---

fix(node-security): wrong verdicts surfaced by Stryker mutation testing (batch 1)

- `no-self-signed-certs` reports `globalThis.process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'` and the template-literal spelling `` = `0` ``. Both disable certificate verification exactly like `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'`, which was already reported.
- `no-toctou-vulnerability` no longer reports `if (!fs.existsSync(dir)) fs.mkdirSync(dir, { 'recursive': true })`: a quoted `recursive` key is the same idempotent option as the unquoted one, which was already exempt.
- `no-toctou-vulnerability` reports the `fs/promises` spelling of stat-then-use: `const st = await stat(p); if (st.isFile()) await unlink(p);`. The awaited `stat` / `lstat` result was never recognised as a Stats object.
- `no-unsafe-dynamic-require` tracks the loader returned by `module.createRequire(import.meta.url)` (the `node:module` default import), as it already did for a bare `createRequire(...)`.
- `detect-child-process` reads a quoted or computed `shell` key: `spawn('ls', ['--', dir], { 'shell': true })` runs through `/bin/sh` exactly like `{ shell: true }`, and is now judged as a shell call.
- `detect-child-process` resolves a quoted or computed key in a destructured require: `const { 'exec': run } = require('child_process'); run(req.query.cmd)` is now reported like `{ exec: run }`.
- `no-arbitrary-file-access` follows a path destructured from the request: `const { file } = req.query; fs.readFileSync(file)` is now reported like `const file = req.query.file`.
- `no-arbitrary-file-access` no longer treats a `path.join` as sanitised because one argument is a `path.basename()` result: `path.join(UPLOAD_ROOT, req.query.folder, name)` escapes the root with `folder = '../../etc'`, and is now reported. A join whose request-derived parts all go through `basename` stays silent.
- `no-timing-unsafe-compare` reads a `#private` field like a public one: `this.#apiToken === req.query.t` is now reported like `this.apiToken === req.query.t`.
- `no-math-random-crypto` no longer reads a draw inside a block-bodied arrow as that arrow's value: `const authRetry = setInterval(() => { delay = Math.random() * 1000; })` and an `async (req, res) => { await sleep(Math.random() * 100); }` handler named after auth are silent, as the `function () {}` spelling already was.
