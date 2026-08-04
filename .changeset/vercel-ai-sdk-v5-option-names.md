---
'eslint-plugin-vercel-ai-security': minor
---

Catch AI output interpolated into SQL, and accept `max_output_tokens`

`no-unsafe-output-handling` now walks a template literal's `${...}`
expressions and the operands of a `+` chain instead of pattern-matching the
whole source text. This closes a false negative where a tracked binding —
``const { text } = await generateText(...); db.query(`... ${text}`)`` — was
missed even though the eval and innerHTML branches already tracked it. Text
matching only ever caught the `${result.text}` spelling, because the patterns
look for `.text` while the destructured source reads `text`. It also drops a
false positive on SQL whose literal text merely contained a pattern word
(e.g. a `generated_reports` table name).

`require-max-tokens` now accepts `max_output_tokens`. It already accepted the
snake_case spelling of the v4 name (`max_tokens`) but not of the v5 one, so a
call bounded through a provider-shaped config object was still reported.
