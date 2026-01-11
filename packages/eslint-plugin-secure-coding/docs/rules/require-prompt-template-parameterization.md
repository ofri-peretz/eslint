# require-prompt-template-parameterization

Enforce structured prompt templates instead of string interpolation for LLM APIs.

**OWASP LLM Top 10 2025**: LLM01 - Prompt Injection  
**CWE**: [CWE-20](https://cwe.mitre.org/data/definitions/20.html)  
**Severity**: 🔴 Critical

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

This rule enforces the use of structured message arrays or template engines instead of string interpolation when calling LLM APIs. Structured formats provide better separation between instructions and user data, reducing prompt injection risks.

### ❌ Incorrect

```typescript
// Template literal passed directly
await llm.complete(`Summarize: ${userInput}`);

// String concatenation
await llm.chat('Analyze: ' + userContent);

// Template in OpenAI call
await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: `Question: ${q}` }],
});
```

### ✅ Correct

```typescript
// Structured messages array
await llm.complete({
  messages: [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: userInput },
  ],
});

// Messages as first argument
const messages = [{ role: 'user', content: userQuery }];
await llm.chat(messages);

// LangChain PromptTemplate
const template = new PromptTemplate({
  template: 'Summarize: {input}',
  inputVariables: ['input'],
});
await llm.complete(template.format({ input: userInput }));

// ChatPromptTemplate
const prompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are helpful'],
  ['user', '{input}'],
]);
await llm.chat(await prompt.format({ input: userInput }));

// Static string (no variables)
await llm.complete('What is 2+2?');
```

## Options

```json
{
  "secure-coding/require-prompt-template-parameterization": [
    "error",
    {
      "llmApiPatterns": ["customLLM.*"],
      "allowedTemplateEngines": ["MyPromptTemplate"]
    }
  ]
}
```

### `llmApiPatterns`

Array of additional LLM API patterns to check. Default patterns:

- `llm.complete`, `llm.chat`
- `openai.chat`, `openai.complete`
- `anthropic.complete`
- `chatCompletion`, `textCompletion`

### `allowedTemplateEngines`

Array of template engine names to allow. Default:

- `PromptTemplate`
- `ChatPromptTemplate`
- `promptTemplate`

## Why This Matters

**Structured formats** provide:

1. **Clear role separation** - System vs user messages
2. **Type safety** - Structured data over strings
3. **Better parsing** - Easier to validate and sanitize
4. **LLM optimization** - Better instruction following

## Examples

### OpenAI SDK (Correct Usage)

```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: userQuestion },
  ],
});
```

### Anthropic SDK (Correct Usage)

```typescript
const message = await anthropic.messages.create({
  model: 'claude-3-opus-20240229',
  messages: [{ role: 'user', content: userPrompt }],
});
```

## When Not To Use It

- If your codebase doesn't use LLM APIs
- If you have custom prompt safety mechanisms

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

## Further Reading

- [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [LangChain Prompt Templates](https://js.langchain.com/docs/modules/prompts/)
- [Anthropic Prompt Design](https://docs.anthropic.com/claude/docs/prompt-design)

## Compatibility

- ✅ ESLint 8.x
- ✅ ESLint 9.x
- ✅ TypeScript
- ✅ JavaScript (ES6+)

## Version

This rule was introduced in `eslint-plugin-secure-coding` v2.3.0 (OWASP LLM 2025 support).
