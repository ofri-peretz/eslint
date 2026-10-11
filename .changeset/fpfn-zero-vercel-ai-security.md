---
'eslint-plugin-vercel-ai-security': minor
---

fix(vercel-ai-security): follow values across same-file hops; close the four deferred FNs; optional type info

No preset changes. The new detections can report code that was not reported before:

- `no-dynamic-system-prompt`, `require-validated-prompt` and `require-max-steps` now follow a request value through any number of same-file hops: second variables, reassignments, same-file helper returns, and parameters fed from the request. Example: `const persona = body.persona; system: persona`.
- `no-dynamic-system-prompt` treats a call to a same-file function whose every return is static text as static.
- `require-rag-content-validation`:
  - Follows retrieved content through `.map` / `.filter` / `.join` / `.slice`, templates and same-file helpers into `prompt` / `system`, for example `docs.map(d => d.pageContent).join()`.
  - Stops at configured validators.
  - Its old name-keyed variable tracking was removed.
- `no-unsafe-output-handling`:
  - Follows model output through same-file variables and helpers.
  - Reports `dangerouslySetInnerHTML` fed from a prop typed with an SDK message type (`UIMessage` / `Message` from `ai` / `@ai-sdk/*`, directly or through a same-file alias or interface), or from `useChat` / `useCompletion` / `useObject` / `useAssistant` imported from the SDK, including through `.map(m => <C m={m} />)` into a same-file component.
- `no-sensitive-in-prompt` reports a whole record in `JSON.stringify(x)`, `String(x)` or `${x}` when its fields include a sensitive one:
  - With `parserOptions.projectService`, the declared property names of `x`'s type decide.
  - Without type information, `x` must resolve in the file to an object literal with a sensitive key, or to a full database row (a Prisma, pg, postgres, mysql2, knex, kysely, drizzle, `@vercel/postgres` or better-sqlite3 read with no column projection).
  - Field reads and chat history spread into `messages` are not reported.

Type information is optional and only sharpens these verdicts. Nothing is decided from variable names.

Full audit: `benchmarks/audits/2026-10-10-fp-fn-vercel-ai-security.md`.
