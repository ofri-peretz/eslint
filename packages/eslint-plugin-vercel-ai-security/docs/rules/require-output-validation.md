# `require-output-validation`

> Requires validation of AI output before displaying to users.

## 📊 Rule Details

| Property           | Value                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| **Type**           | suggestion                                                                                           |
| **Severity**       | 🟡 MEDIUM                                                                                            |
| **OWASP LLM**      | [LLM09: Misinformation](https://owasp.org/www-project-top-10-for-large-language-model-applications/) |
| **CWE**            | [CWE-707: Improper Neutralization](https://cwe.mitre.org/data/definitions/707.html)                  |
| **CVSS**           | 5.0                                                                                                  |
| **Config Default** | `off` (recommended), `error` (strict)                                                                |

## 🔍 What This Rule Detects

This rule identifies code patterns where AI-generated output is displayed to users without validation or fact-checking.

## ❌ Incorrect Code

```typescript
// Direct AI output display
display(result.text);

// Unvalidated response content
render(response.content);

// AI output in object
respond({ message: result.text });
```

## ✅ Correct Code

```typescript
// Validated output
display(validateOutput(result.text));

// Fact-checked output
render(factCheck(response.content));

// Sanitized in object
respond({ message: sanitize(result.text) });
```

## ⚙️ Options

| Option               | Type       | Default                                           | Description                            |
| -------------------- | ---------- | ------------------------------------------------- | -------------------------------------- |
| `displayPatterns`    | `string[]` | `['render', 'display', 'show', 'send']`           | Patterns suggesting display operations |
| `validatorFunctions` | `string[]` | `['validate', 'verify', 'factCheck', 'sanitize']` | Functions that validate output         |

## 🛡️ Why This Matters

Unvalidated AI output can:

- **Spread misinformation** - AI hallucinations presented as fact
- **Cause harm** - Medical, legal, financial misinformation
- **Damage reputation** - Incorrect information attributed to your brand
- **Violate regulations** - False claims in regulated industries

## 📚 References

- [OWASP LLM09: Misinformation](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [CWE-707: Improper Neutralization](https://cwe.mitre.org/data/definitions/707.html)
