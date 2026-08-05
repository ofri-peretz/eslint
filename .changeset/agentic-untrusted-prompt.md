---
'@interlace/eslint-devkit': minor
'eslint-plugin-openai-security': minor
'eslint-plugin-anthropic-security': minor
'eslint-plugin-gemini-security': minor
---

New rule `no-untrusted-content-in-prompt` (CWE-1427) on all three raw inference
SDKs, from a shared `createSystemPromptInjectionRule` factory.

A system prompt is instruction text: whatever is spliced into it is read by the
model as instructions rather than as data, so anyone who controls that value
controls the agent. The rule reports a system prompt that is not static, in both
shapes the raw SDKs use — the named option (`system`, `instructions`,
`systemInstruction`) and the `messages: [{ role: 'system', content }]` array.

A bare identifier counts as static. `system: SYSTEM_PROMPT` is the correct
pattern and by far the most common one; following it is the data-flow analysis
these rules avoid.

**`strict` only.** Unlike the credential rules, this one has a genuine
false-positive shape — a system prompt interpolating today's date is not an
injection and the rule cannot tell the difference. Promotion to `recommended`
waits on the corpus measurement.

Gating is by qualified member path (`messages.create`, `completions.create`,
`generateContent`), not by leaf method name. `create` alone is shared across
these SDKs, and matching on it made a file importing two of them report one line
twice. `vercel-ai-security/no-dynamic-system-prompt` keeps the bare-function
`generateText(...)` form, which has no member path at all — verified by linting
a file that imports all four SDKs and uses every shape: no line is reported
twice.
