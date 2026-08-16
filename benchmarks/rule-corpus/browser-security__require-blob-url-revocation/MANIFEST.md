# Rule corpus — `browser-security/require-blob-url-revocation` (CWE-401)

Written from CWE-401 semantics and real Blob/ObjectURL idiom, **not** from the
rule's own test file. The point is independent evidence: a corpus derived from
the tests can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet. Every competitor is
scored on exactly the same files.

## What the rule claims

`meta.docs.description` — "Require revoking Blob URLs to prevent memory leaks".
An object URL is a document-scoped handle that pins its Blob until it is
explicitly revoked; a page that mints one per interaction retains every file the
user ever touched.

## The three questions it has to answer

1. **Is this the platform's `URL`?** Both halves used to require a bare
   `Identifier` named `URL`, so one omission produced a false negative and a
   false positive at once: `window.URL.createObjectURL(blob)` was not a
   creation, and `window.URL.revokeObjectURL(url)` was not a revocation. Inside
   a worker `self.URL` is the only spelling available (`vulnerable/07`,
   `safe/04`).

2. **Where did the handle go?** Only `const x = URL.createObjectURL(...)` was
   tracked, so `img.src = URL.createObjectURL(file)` — the single most common
   spelling of the API — was invisible (`vulnerable/02`, `safe/03`).

3. **Is *this* handle the one that was released?** Ownership was keyed on the
   variable's NAME, file-wide. `vulnerable/10` is two sibling exporters that both
   call their handle `objectUrl` and only one of which cleans up; the name map
   marks both released.

## Waves

`01`–`08` are the first wave: a CSV download, an image preview, a React effect,
the qualified global, an array-indexed source, a caller that drops a helper's
handle, a service worker, and a handle stored nowhere at all.

`09`–`10` are the **adversarial wave**. `09` calls `revokeObjectURL` — on a
*different* handle, releasing the previous URL while leaking the new one, which
satisfies any rule that only checks whether the file mentions revocation. `10` is
the same-name-different-scope case above.

`safe/05` pins the deliberate limit: a helper that `return`s the handle delegates
release to its caller, which this file cannot see. Reporting it would be a false
positive in exactly the well-factored code most likely to be correct.
`safe/06` is the receiver test — a test double and a media library that both
expose a `createObjectURL` method.
