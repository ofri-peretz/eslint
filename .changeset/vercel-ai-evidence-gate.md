---
'eslint-plugin-vercel-ai-security': major
---

Every rule now abstains in files without local Vercel AI SDK evidence

The plugin had no notion of whether a file used the AI SDK. Measured over
**107,384 files across 107 pinned repositories**: 1,909 findings, of which
**1,738 (91%) were in files with no `ai` / `@ai-sdk` import** — the highest
off-SDK rate in the ecosystem. `no-hardcoded-api-keys` alone contributed 782,
`no-training-data-exposure` 410, `require-output-validation` 314.

Every rule now requires local evidence: an `import`, `require`, or dynamic
`import()` of `ai` or any `@ai-sdk/*` package, matched on the package root and
never on a relative specifier. The `@ai-sdk` scope is matched whole rather than
as an enumerated provider list, so a consumer on `@ai-sdk/mistral` or a provider
that ships next month is covered on arrival — an allow-list would silently stop
opening the gate, and a security rule that quietly stops reporting is the worse
failure direction.

**The evidence is imports only, and that is a deliberate departure from the
Express gate.** Express needed a second, signature-based arm because 60% of
files holding a real `(req, res)` handler import no `express` — route modules
receive `app`/`router` from a caller. The same measurement here says the
opposite. Of the 29 non-`.d.ts` corpus files that call `generateText`,
`streamText`, `streamObject`, `generateObject` or `useChat` without importing
the SDK, **zero are the Vercel AI SDK**:

- 16 import that same name from a different vendor — both `@kapaai/react-sdk`
  and `@orama/ui/hooks/useChat` export a `useChat`
- `stream-json` exposes `StreamObject.streamObject()`
- `swig-email-templates` has `generateText(path, ctx, html, cb)`
- LangChain's IBM provider calls `this.service.generateText(...)`
- the last two are a `streamText` inside a JSDoc code fence and a `generateText`
  inside a JSON string literal of CMS seed content

A call-signature arm would therefore re-admit exactly the false positives this
gate removes — detecting a *word* rather than an *SDK*, which is the root defect
behind every gate in this ecosystem.

A locally bound `require` is not module loading: `function f(require) {
require('ai') }` does not open the gate. Shadowing is **lexical**, propagated
down the walk, so `const ai = require('ai'); function wrap(require) {}` still
reports — the file-wide flag that regressed express/postgres in #483 is not
repeated here. The probe is cached per `Program`, so nineteen rules cost one AST
walk rather than nineteen.

**Recall cost measured, not assumed.** Every finding over all 3,386 corpus files
that import the SDK was diffed before and after: **8,157 → 8,143**. The 14
removed are all in one file, `vercel-ai/content/tools-registry/registry.ts`,
whose only `import … from 'ai'` occurrences are inside `codeExample:` template
literals — the file imports nothing. All 14 were `no-hardcoded-api-keys` firing
on `apiKeyUrl: 'https://vercel.com/docs/…'`, public documentation URLs matched
because the property name contains `apiKey`. **Zero real findings lost, and the
one file affected demonstrates the defect rather than a cost.**

Locked by `src/module-gate.lock.test.ts` over the whole rule registry, so a rule
added later fails until it is gated too. The negatives are the measured
vendor-collision shapes above; five positive controls (static import, scoped
provider, an un-enumerated provider, `require`, and a dynamic `await import`)
prevent the suite passing with the gate shut on everything.
