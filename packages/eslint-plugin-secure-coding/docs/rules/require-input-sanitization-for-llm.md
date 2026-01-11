# require-input-sanitization-for-llm

Enforce input sanitization before LLM API calls.

**OWASP LLM Top 10 2025**: LLM01 - Prompt Injection  
**CWE**: [CWE-20](https://cwe.mitre.org/data/definitions/20.html)  
**Severity**: 🔴 High

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-20 OWASP:A06 CVSS:7.5 | Improper Input Validation detected | HIGH [SOC2,PCI-DSS,HIPAA,GDPR,ISO27001]
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A06_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-20](https://cwe.mitre.org/data/definitions/20.html) [OWASP:A06](https://owasp.org/Top10/A06_2021-Injection/) [CVSS:7.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `Improper Input Validation detected` |
| **Severity & Compliance** | Impact assessment | `HIGH [SOC2,PCI-DSS,HIPAA,GDPR,ISO27001]` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A06_2021-Injection/) |

## Rule Details

Requires all user input to be sanitized before being passed to LLM APIs.

### ❌ Incorrect

```typescript
await llm.complete(userInput);
await llm.chat(req.body.input);
```

### ✅ Correct

```typescript
const clean = sanitizeInput(userInput);
await llm.complete(clean);

const validated = validateInput(userQuery);
await llm.chat(validated);
```

## Options

```json
{
  "secure-coding/require-input-sanitization-for-llm": [
    "error",
    {
      "trustedSanitizers": ["sanitizeInput", "validateInput", "promptGuard"]
    }
  ]
}
```

## Version

Introduced in v2.3.0

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Prompt from Variable

**Why**: Prompt content from variables not traced.

```typescript
// ❌ NOT DETECTED - Prompt from variable
const prompt = buildPrompt(userInput);
await generateText({ prompt });
```

**Mitigation**: Validate all prompt components.

### Nested Context

**Why**: Deep nesting obscures injection.

```typescript
// ❌ NOT DETECTED - Nested
const messages = [{ role: 'user', content: userInput }];
await chat({ messages });
```

**Mitigation**: Validate at all levels.

### Custom AI Wrappers

**Why**: Custom AI clients not recognized.

```typescript
// ❌ NOT DETECTED - Custom wrapper
myAI.complete(userPrompt);
```

**Mitigation**: Apply rule to wrapper implementations.
