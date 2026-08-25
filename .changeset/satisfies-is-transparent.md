---
'eslint-plugin-secure-coding': patch
'eslint-plugin-node-security': patch
'eslint-plugin-browser-security': patch
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

`no-xpath-injection` matched `[@` as an unambiguous XPath marker. Objective-C
dictionary subscript is spelled the same way, and a code generator emits it as
a string: `bodySnippet += indent + 'if (param[@"fileName"]) {\n'` drew four
CWE-643 findings on postmanlabs/postman-code-generators, in a repository with
no XPath library and no XPath API call. An attribute predicate names the
attribute right after the `@`, so the marker now requires a name or `*`.

`no-hardcoded-credentials` reported `__PYTHON#%0True__`. A dunder-delimited
value is a slot a generator substitutes later — the same argument the rule
already makes for `{{API_KEY}}` and `${SECRET}` — and the same repository
declares `trueToken`, `falseToken` and `nullToken` that way in three files.

`no-fail-open-auth` reported an empty catch that leaves the caller denied.
`let token = null; try { token = verifyJWT(…).accessToken } catch (err) {}`
followed by `if (token) { …grant…; return }` and a deny path below it is closed:
the variable is still falsy, and the gate that reads it returns without
granting. Verified on nightscout/cgm-remote-monitor. The corpus case that must
stay reported has the same opening and then runs the privileged work with
nothing branching on the variable — the difference is a guard that reads it and
leaves, which is now what the rule looks for.

`no-unsafe-buffer-alloc` read only the `const buf = Buffer.allocUnsafe(n)`
spelling when deciding whether a buffer is covered before it is read. The
assignment form — `buf = Buffer.allocUnsafe(n)` onto a binding declared above —
resolved to nothing, so a fill that covers the whole buffer was invisible and
the allocation reported anyway. A write at a computed index inside a loop now
counts as covering, on the same evidence the rule already accepts for
`writeInt32LE(value, position)`.

`no-disabled-certificate-validation` had no test-file handling at all, unlike
its sibling `no-self-signed-certs`, which owns the decision through
`allowInTests`. It now skips test files.

`no-graphql-injection` counted every `${…}` in a GraphQL template as unsafe
interpolation, including the composition idiom every client teaches:
`${MENU_FRAGMENT}` under a selection set, `${CART_QUERY_FRAGMENT}` at the end
of a mutation. Fifty-three findings on Shopify/hydrogen, more than any other
rule on any target scanned. An interpolated identifier is exempt when it
resolves to a single never-rewritten `const` whose initialiser is itself a
GraphQL template — `as const` included. A parameter, an import, a reassigned
binding and an uninitialised one all still report, because none of them
resolves to anything knowable. Measured on hydrogen: 53 findings to 30.

`no-xxe-injection` treated `@xmldom/xmldom`, `fast-xml-parser` and `xml2js` as
parsers that can reach an external entity. A probe says otherwise — the same
document with a `SYSTEM` entity pointed at a local file returns `&xxe;`
unresolved, `External entities are not supported`, and a parse error
respectively. `xpath` was on the list too, and it parses nothing at all. Those
four no longer raise the untrusted-input finding on their own; a deliberately
enabled entity-expansion option still reports on any of them, and
`libxmljs`, `libxmljs2`, `node-expat` and `xml2json` are unchanged. Thirty-one
findings on nasa/earthdata-search, nine on refactoringhq/tolaria, five on
aws/aws-toolkit-vscode.

`no-math-random-crypto` reported the fallback arm of a function that reaches
for a CSPRNG first:

```js
if (window.crypto && window.crypto.getRandomValues) { … return … }
return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
```

That is IGNF/cartes.gouv.fr-entree-carto — the French national geoportal, and
one of our own adopters. The author already knows; reporting the `else` arm of
code that does the right thing whenever it can tells them nothing they have not
written down. A `getRandomValues`, `randomBytes`, `randomUUID`, `randomFillSync`
or `generateKey` call earlier in the same function now exempts the fallback. The
trade is stated rather than hidden: a function that draws a key from `crypto`
and a token from `Math.random()` goes unreported, because the two are
indistinguishable without following the values.

`no-zip-slip` treated a bare `.extract()` on any receiver as archive
extraction. `this.extract("id")` on an entity collection and
`propagator.extract(context.active(), headers, getter)` in OpenTelemetry both
matched — 22 findings on passbolt/passbolt_styleguide, an open-source password
manager, and 3 on nioc/node-red-contrib-opentelemetry. Neither file contains
the substring `zip`, `tar` or `archive` anywhere.

The file-level archive-context guard did not save them, because it was
circular: `isArchiveExtraction()` established the context that
`isArchiveExtraction()` then relied on, so the call being judged was its own
evidence that the file handles archives. Context now comes only from a name
that means an archive, and the four verbs that are ordinary English —
`extract`, `extractAll`, `unzip`, `untar` — need a receiver that names one.
`extractAllTo` and `extractArchive` belong to adm-zip, collide with nothing,
and still match on sight. Both real shapes are pinned as valid cases.

