---
'eslint-plugin-vercel-ai-security': patch
'eslint-plugin-browser-security': patch
---

Document the options the rules actually accept

Ten option names appeared in rule docs but not in the rules' schemas. Because
every schema sets `additionalProperties: false`, copying one out of the docs
did not fail quietly — it aborted the whole lint run:

```
Key "rules": Key "vercel-ai-security/no-hardcoded-api-keys":
  Value {"keyPatterns":[...]} should NOT have additional properties.
  Unexpected property "keyPatterns". Expected properties: "apiKeyPatterns".
```

Six of the seven affected tables were fictional end to end — not one
documented option existed. Affected rules: `no-hardcoded-api-keys`,
`no-unsafe-output-handling`, `require-abort-signal`, `require-max-steps`,
`require-max-tokens`, `require-tool-schema` and
`browser-security/no-sensitive-localstorage`.

Three "Mitigation: configure X" notes pointed at knobs that are hardcoded and
were never configurable; they now say so instead of promising a fix that
cannot be applied.

No rule behaviour changes — this is documentation catching up to the schemas.
