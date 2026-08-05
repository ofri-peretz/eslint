---
'@interlace/eslint-devkit': minor
'eslint-plugin-anthropic-security': minor
'eslint-plugin-openai-security': patch
---

`no-browser-api-key-exposure` now covers the Anthropic SDK too.

The rule shipped on `eslint-plugin-openai-security` only. Its detection moved
into a shared `createBrowserEscapeHatchRule` factory in
`@interlace/eslint-devkit`, and `eslint-plugin-anthropic-security` gains the
rule at `error` in every preset.

Both SDKs refuse to run in a browser by default and both unlock it with the
same `dangerouslyAllowBrowser` flag; the Anthropic SDK's own JSDoc says
client-side use "risks exposing your secret API credentials to attackers".

**Two instantiations, not three.** Verified against the published tarballs
rather than assumed: neither `@google/generative-ai@0.24` nor
`@google/genai@2.15` has a browser escape hatch, because neither refuses the
browser in the first place. There is no flag to detect and no structural signal
a linter can read without knowing whether a file ships to a client, so
`eslint-plugin-gemini-security` does not get this rule. Inventing a fuzzy third
detection would report correct code.

OpenAI's behaviour and its reported messages are unchanged; only the
implementation moved.
