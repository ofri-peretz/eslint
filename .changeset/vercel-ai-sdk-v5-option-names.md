---
'eslint-plugin-vercel-ai-security': minor
---

Support AI SDK v5+ option names, and catch AI output interpolated into SQL

Two rules keyed only on AI SDK v4 option names, so they false-positived on
every v5+ codebase (verified against `ai@6.0.193`, where the v4 names no
longer exist):

- `require-max-tokens` now accepts `maxOutputTokens` (v5+ renamed
  `maxTokens`), plus the `max_output_tokens` snake_case variant.
- `require-max-steps` now accepts `stopWhen` (v5+ replaced `maxSteps` with
  stop conditions, idiomatically `stopWhen: stepCountIs(n)`). Any
  `StopCondition` counts, not just `stepCountIs`.

The v4 names stay accepted, so v4 codebases are unaffected. Both rules' `fix:`
messages now name the option that actually exists on v5+ — previously they
told users to add an option the SDK ignores.

`no-unsafe-output-handling` now walks a template literal's `${...}`
expressions and the operands of a `+` chain instead of pattern-matching the
whole source text. This closes a false negative where a tracked binding —
``const { text } = await generateText(...); db.query(`... ${text}`)`` — was
missed even though the eval and innerHTML branches already tracked it, and
also drops a false positive on SQL whose literal text merely contained a
pattern word (e.g. a `generated_reports` table name).
