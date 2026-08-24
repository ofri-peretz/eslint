---
'eslint-plugin-secure-coding': patch
---

fix: `no-improper-sanitization` reported through a `satisfies` wrapper.

The `ArrayExpression` fix in the previous release shipped with a unit test using
a bare array, which passed — while the file that produced the finding still
reported twice, because its payload carries `satisfies Block[]`. The climb that
decides whether a literal is developer-authored stopped at the TypeScript
wrapper, so the literal fell back to a check that asks only whether it contains
a dangerous character, and an apostrophe in `"You don't have permission to
write to this resource"` reported again.

`satisfies`, `as`, `!` and angle-bracket assertions are now transparent in both
the climb and the safety test. Markup underneath a wrapper still reports.

`no-unsafe-deserialization` treated `x.eval(…)` on any receiver as a JavaScript
code-execution sink. `client.eval(luaScript, 1, key, …)` is Redis EVAL — Lua,
on the server, compiling nothing here — and it was the only finding in all of
animir/node-rate-limiter-flexible. The Identifier branch already restricted
`eval` and `Function` to globals; the member branch now does too. A member
`deserialize` is still dangerous on any receiver.

`no-toctou-vulnerability` reported `if (!existsSync(dir)) mkdirSync(dir, {
recursive: true })`. `recursive` means the call does not throw when the
directory already exists, so losing the race is not an error, and `mkdir`
writes no content — a substituted symlink makes it a no-op rather than a
mutation landing on the attacker's name. Seven findings on
nightscout/cgm-remote-monitor, all of this shape, where the remedy the message
asks for is the code already written. Non-recursive `mkdirSync(dir)` throws
EEXIST, so its guard is load-bearing and it still reports.

`no-unencrypted-transmission` honoured `allowInTests` for template literals but
not for plain string ones, so `"redis://localhost:6379"` in a spec file was
reachable by neither that option nor the loopback exemption — which is
scheme-gated on purpose, because a `mongodb://` string carries credentials that
survive a host swap. Twenty-one findings on moleculerjs/moleculer. Loopback in
a test file is now exempt on any scheme when the consumer opts in; a real host
in a test file, and loopback in production code, both still report.

`no-unsafe-buffer-alloc` cleared a covering write only when the allocation
landed in a `const` declarator. Protocol code allocates inside a branch and
assigns to a binding declared above it — `geoBuff = Buffer.allocUnsafe(9 + size)`
— which the analysis never inspected: 38 findings on
mariadb-connector-nodejs, every one a fully-written buffer. The assignment form
is now resolved too, counting only references after the allocation so a write
belonging to the previous value cannot clear this one. A loop writing
`buf[i] = …` at a moving index is also recognised as covering, which is the
same walk `writeUInt8(v, pos)` performs.

`no-disabled-certificate-validation` takes `skipTestFiles`: an integration test
against a local server with a self-signed certificate has no other way to
connect, and all 21 findings on mariadb-connector-nodejs were under `test/`.
Its sibling `no-self-signed-certs` deliberately does NOT — it already owns the
decision through `allowInTests`, and `skipTestFiles` runs before `create()`,
which would make that option dead.
