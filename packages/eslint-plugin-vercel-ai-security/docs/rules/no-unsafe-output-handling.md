# `no-unsafe-output-handling`

> Prevents using AI-generated content in dangerous operations like eval, SQL, or innerHTML.

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
// Sandboxed execution
const result = await generateText({ prompt: 'Generate code' });
runInSandbox(result.text);

// Safe text content
element.textContent = result.text;

// Parameterized query
db.query('SELECT * FROM users WHERE id = ?', [parsedId]);

// Validated command
if (allowedCommands.includes(result.text)) {
  exec(result.text);
}
```

## ⚙️ Options

| Option                | Type       | Default                                                                          | Description                                |
| --------------------- | ---------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| `dangerousFunctions`  | `string[]` | `['eval', 'Function', 'setTimeout', 'setInterval', 'exec', 'execSync', 'spawn']` | Functions to flag when receiving AI output |
| `dangerousProperties` | `string[]` | `['innerHTML', 'outerHTML']`                                                     | Properties to flag when assigned AI output |

## 🛡️ Why This Matters

Passing AI output to dangerous functions enables:

- **Remote Code Execution (RCE)** - Attackers can inject code via prompt manipulation
- **Cross-Site Scripting (XSS)** - Malicious scripts in generated HTML
- **SQL Injection** - Database manipulation via generated queries
- **Command Injection** - System command execution

## 🔗 Related Rules

- [`require-validated-prompt`](./require-validated-prompt.md) - Validate input prompts
- [`require-output-filtering`](./require-output-filtering.md) - Filter tool output

## 📚 References

- [OWASP LLM05: Improper Output Handling](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [OWASP ASI05: Unexpected Code Execution](https://owasp.org)
- [CWE-94: Improper Control of Code Generation](https://cwe.mitre.org/data/definitions/94.html)
