---
title: no-unsafe-output-handling
description: This rule identifies code patterns where AI-generated output is passed directly to dangerous functions that can execu...
tags: ['security', 'ai']
category: security
severity: medium
cwe: CWE-94
autofix: false
---

> Prevents using AI-generated content in dangerous operations like eval, SQL, or innerHTML.


<!-- @rule-summary -->
This rule identifies code patterns where AI-generated output is passed directly to dangerous functions that can execu...
<!-- @/rule-summary -->

## 📊 Rule Details

| Property           | Value                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Type**           | problem                                                                                                        |
| **Severity**       | 🔴 CRITICAL                                                                                                    |
| **OWASP LLM**      | [LLM05: Improper Output Handling](https://owasp.org/www-project-top-10-for-large-language-model-applications/) |
| **OWASP Agentic**  | [ASI05: Unexpected Code Execution](https://owasp.org)                                                          |
| **CWE**            | [CWE-94: Improper Control of Code Generation](https://cwe.mitre.org/data/definitions/94.html)                  |
| **CVSS**           | 9.8                                                                                                            |
| **Config Default** | `error` (recommended, strict)                                                                                  |

## 🔍 What This Rule Detects

This rule identifies code patterns where AI-generated output is passed directly to dangerous functions that can execute code, manipulate the DOM, or run database queries.

## ❌ Incorrect Code

```typescript
// Code execution
const result = await generateText({ prompt: 'Generate code' });
eval(result.text);

// Function constructor
new Function(result.text)();

// XSS via innerHTML
element.innerHTML = result.text;

// SQL injection
db.query(result.text);

// Shell execution
exec(result.text);
```

## ✅ Correct Code

```typescript
Hello
```

## ⚙️ Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `aiOutputPatterns` | `string[]` | `["result.text","response.text","completion","generated","aiOutput","aiResponse","llmOutput","llmResponse","modelOutput",".text"]` | Variable patterns that suggest AI output |

## 🛡️ Why This Matters

Passing AI output to dangerous functions enables:

- **Remote Code Execution (RCE)** - Attackers can inject code via prompt manipulation
- **Cross-Site Scripting (XSS)** - Malicious scripts in generated HTML
- **SQL Injection** - Database manipulation via generated queries
- **Command Injection** - System command execution

## 🔗 Related Rules

- [`require-validated-prompt`](./require-validated-prompt.md) - Validate input prompts
- [`require-output-filtering`](./require-output-filtering.md) - Filter tool output

## 🔄 Changes in the 2026-10-10 FP/FN audit

- **Tool inputs are model output.** The parameters of a tool's `execute` (in
  `tool({...})`, `dynamicTool({...})`, or an object literal with
  `inputSchema`/`parameters`) are filled from the model's tool call, so
  `execute: async ({ command }) => execSync(command)` is reported.
- **Sinks are matched by resolved callee, never by substring.** Code execution:
  global `eval` / `Function` (call or `new`), `child_process`
  `exec`/`execSync`/`execFile`/`execFileSync`/`spawn`/`spawnSync`/`fork`, and
  `vm` `runInNewContext`/`runInThisContext`/`runInContext`/`compileFunction`/
  `new vm.Script` — resolved through imports and `require`. SQL: the first
  argument of `.query`/`.execute`/`.raw`/`.run`/`.unsafe`/`$queryRawUnsafe`/
  `$executeRawUnsafe`. `/re/.exec(result.text)`, `evaluateAnswer(...)` and
  `truncate(...)` are no longer reported.
- **New sinks:** `dangerouslySetInnerHTML={{ __html: … }}`, and `fetch(url)`
  where model output chooses the URL or its leading part (new message
  `unsafeOutputInRequest`, CWE-918). A fixed host with model input in the query
  string is not reported.
- **Calls are not output.** `DOMPurify.sanitize(result.text)` assigned to
  `innerHTML` is not reported; a string method on output (`text.trim()`) still is.
- `textContent` was removed from the default `aiOutputPatterns`.
- **Options:** the documented `defaultOptions` now apply. Earlier versions read `context.options` and silently ran a shorter hard-coded list instead.

## 🔄 Changes in the 2026-10-11 zero-deferral pass

- Model output is followed through same-file declarations, reassignments,
  string / array derivations and helpers: `const foo = wrap(text); eval(foo)`.
- **UI sources:** a component parameter typed with an SDK message type
  (`{ m }: { m: UIMessage }`, a same-file props alias or interface naming one),
  and the result of `useChat` / `useCompletion` / `useObject` /
  `useAssistant` imported from the SDK — including through
  `messages.map((m) => <Bubble m={m} />)` into a same-file component. A
  same-named hook from another package is not one.

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Custom Dangerous Functions

**Why**: Non-standard execution functions may not be detected.

```typescript
// ❌ NOT DETECTED - Custom exec wrapper
executeCode(result.text); // Custom wrapper, not one of the recognised sinks
```

**Mitigation**: none available — the recognised sinks (global `eval` /
`Function`, `child_process` and `vm` functions resolved through imports, and
the SQL / `fetch` / HTML sinks listed above) are fixed and not configurable.
Call the underlying function directly at the point the AI output is used, or
wrap the call site in your own review.

### Dynamic Function Invocation

**Why**: Dynamic property access is not analyzed.

```typescript
// ❌ NOT DETECTED - Dynamic invocation
const method = 'eval';
window[method](result.text); // Dynamic access
```

**Mitigation**: Avoid dynamic function invocation.

## 📚 References

- [OWASP LLM05: Improper Output Handling](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [OWASP ASI05: Unexpected Code Execution](https://owasp.org)
- [CWE-94: Improper Control of Code Generation](https://cwe.mitre.org/data/definitions/94.html)

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-94 OWASP:A05 CVSS:9.8 | Code Injection detected | CRITICAL [SOC2,PCI-DSS,ISO27001]
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A05_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-94](https://cwe.mitre.org/data/definitions/94.html) [OWASP:A05](https://owasp.org/Top10/A05_2021-Injection/) [CVSS:9.8](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV%3AN%2FAC%3AL%2FPR%3AN%2FUI%3AN%2FS%3AU%2FC%3AH%2FI%3AH%2FA%3AH) |
| **Issue Description** | Specific vulnerability | `Code Injection detected` |
| **Severity & Compliance** | Impact assessment | `CRITICAL [SOC2,PCI-DSS,ISO27001]` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A05_2021-Injection/) |