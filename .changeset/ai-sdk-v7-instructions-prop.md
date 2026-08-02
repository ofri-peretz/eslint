---
'eslint-plugin-vercel-ai-security': minor
---

Detect the AI SDK v7 `instructions` option, not just the deprecated `system`.

AI SDK v7 renamed the system-prompt option to `instructions` and marks `system` as
`@deprecated Use 'instructions' instead` in its own type definitions. Four rules matched
the property name `system` literally, so on any code written against current AI SDK docs
they reported nothing at all:

- `no-dynamic-system-prompt`
- `require-validated-prompt` (its `unsafeSystemPrompt` branch)
- `require-rag-content-validation`
- `no-sensitive-in-prompt`

All four now accept either spelling via a shared `SYSTEM_PROMPT_PROPS` set, so `system`
keeps working for pre-v7 code and `instructions` is covered going forward.

The same pass closed a second silent miss in those rules: a quoted key
(`{ "instructions": … }`) parses to a string `Literal`, not an `Identifier`, and
three of the four rules read only `Identifier` keys — so putting quotes round the
key was enough to stop them firing. Key extraction now goes through a shared
`getStaticPropName` helper. Three fixtures that recorded this as expected
behaviour (one labelled "documented FN: only Identifier keys are matched") moved
from `valid` to `invalid`, since a rule that stops firing on formatting is a miss,
not a design decision. Computed keys (`{ [k]: … }`) still return `null` — there
the name genuinely isn't statically known.

This was found the hard way. Scanning the `nuxt-ui-templates/chat` template, a system
prompt interpolating the signed-in user's name straight into `instructions:` went
unreported — the finding was spotted by reading the file, not by the linter that exists to
catch it. Each of the four rules now carries a regression test that fails if the
`instructions` spelling is dropped again, and one of them uses the exact template-literal
shape from that file.
