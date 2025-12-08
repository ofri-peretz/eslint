# Security Rules Roadmap — LLM/MCP Focus

## Objectives

- Ship LLM/MCP-focused presets and guidance that are immediately usable.
- Make existing rules friendlier to LLM/MCP agents (messages + remediation).
- Add tests/fixtures that cover agent and tool flows (JS/TS/async).
- Document hardening and quickstart paths; keep competitive edge clear.

---

## Fast-Track Deliverables (no new rules)

| Area      | Item                                               | Outcome                                                                      |
| --------- | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| Presets   | `recommended-llm`, `recommended-mcp`, `strict-mcp` | Drop-in configs tuned for agent/tool code; perf-safe defaults                |
| Messaging | LLM/MCP remediation hints in existing rules        | Findings explain tool allowlists, prompt sanitization, timeouts, rate limits |
| Tests     | MCP tool wrappers + agent pipeline fixtures        | Positive/negative, TS/JS/JSX, async/streaming, dynamic props                 |
| Docs      | LLM/MCP Hardening + preset quickstart              | Bad/good snippets, config examples, troubleshooting, CVSS/OWASP/CWE notes    |
| QA        | Build + lint + targeted rule test suites           | Evidence for release readiness                                               |

---

## New LLM/MCP Rule Candidates (backlog)

| Rule                                | CWE/OWASP                    | What it should catch                                                       | Notes                                                              |
| ----------------------------------- | ---------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Prompt Injection / Templating Guard | CWE-20/116, OWASP A03        | Unescaped user input in prompts, unsafe template concat, missing redaction | Add allowlists for variables/tool names; enforce encoding/escaping |
| Tool Invocation Guard               | CWE-78/918/94, OWASP A05/A10 | Unbounded network/file/exec calls from tools; no allowlist/timeout/auth    | Require allowlist + timeout + retry/backoff + size caps            |
| LLM Output Handling                 | CWE-79/94/502, OWASP A03/A08 | Directly executing/reflecting model output; unsafe deserialization         | Gate model output through validation/sandbox                       |

---

## Enhancements to Existing Rules (LLM/MCP context)

| Rule area                                               | Added guidance                                                                                               |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Injection (SQL/GraphQL/LDAP/XXE/XPath/Directive/Format) | Treat prompts/tool inputs as sources; require parameterization/allowlists even for agent-generated queries   |
| Command/Process/Require                                 | Tool wrappers invoking shell/require must use allowlists; prefer `execFile`/`shell:false`; no raw model args |
| Deserialization/Object Injection                        | Validate model/tool output before `JSON.parse`/`Function`/merge; use schemas and `Object.create(null)`       |
| Resource/Loop/Regex                                     | Add caps (iterations, size, depth, regex complexity) and timeouts for agent-driven inputs                    |
| AuthZ/Privilege                                         | Role/permission checks required around agent actions; block privilege elevation from model-supplied data     |
| Network/Headers/CORS                                    | URL/origin allowlists for tool calls; block internal IPs; HTTPS-only                                         |
| Data Exposure/Logging                                   | Redact secrets/PII before prompts/logs; forbid raw prompts/responses in logs                                 |

---

## Test Coverage Plan (fast-track)

- MCP tool/agent fixtures: tool schemas, invocations with allowlist/timeout vs. missing.
- Prompt templates: safe vs. unsafe interpolation (string concat, template literals, dynamic props).
- Network/file/exec wrappers: allowlisted vs. arbitrary URLs/paths/commands; streaming with/without caps.
- AuthZ flows: privilege checks present/absent around agent actions.
- Modalities: JS, TS, JSX/TSX; async, callbacks, Promise chains.

---

## Documentation Plan (fast-track)

- **LLM/MCP Hardening**: bad/good snippets for prompts, tool invocations, output handling, authZ, network/file.
- **Presets Quickstart**: enable `recommended-llm` / `recommended-mcp` / `strict-mcp`; perf notes.
- **Troubleshooting**: common false positives/negatives; tuning allowlists/timeouts/size caps.
- **Mapping**: CVSS/OWASP/CWE per relevant rule; call out MCP/LLM threat notes.

---

## Competitive Edge (next waves)

- Unique MCP/LLM coverage: prompt injection sinks, tool misuse, sandbox escape, SSRF via tool URLs, secrets-in-prompt/log.
- AI-generated code guardrails: detect insecure generated snippets.
- Supply chain for agent tools: dependency policy tuned to MCP toolkits.

---

## Phasing

- **Phase 1 (current)**: Presets, message improvements, tests/fixtures, docs, QA evidence.
- **Phase 2**: Implement new LLM/MCP rules (prompt guard, tool guard, output handling) with full tests/docs.
- **Phase 3**: Broader competitive set (AI-generated code guardrails, supply-chain for tools), deeper perf/FP tuning.
