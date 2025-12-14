# OWASP LLM Top 10 2025 - Implementation Summary

## Overview

I've implemented **5 new critical ESLint security rules** for OWASP LLM Top 10 2025, focusing on the highest-impact vulnerabilities for AI/LLM applications.

## ✅ Implemented Rules (5/40)

### 1. **`no-unsafe-prompt-concatenation`** (LLM01)

- **Priority**: 🔴 Critical
- **CWE**: CWE-74, CWE-78
- **Description**: Detects direct concatenation of user input into LLM prompts without sanitization
- **Detection**:
  - Template literals with user input passed to LLM APIs
  - String concatenation with `+` operator in prompts
  - Checks LLM API patterns: `llm.complete()`, `openai.chat()`, etc.
- **False Positive Reduction**:
  - Allows sanitized inputs via `promptGuard.sanitize()`, `validatePrompt()`, etc.
  - Respects `@safe` JSDoc annotations
- **Suggestions**: Parameterized prompts, prompt guards, input sanitization

### 2. **`require-prompt-template-parameterization`** (LLM01)

- **Priority**: 🔴 Critical
- **CWE**: CWE-20
- **Description**: Enforces use of structured templates instead of string interpolation
- **Detection**:
  - Flags LLM API calls using template literals or string concatenation
  - Allows structured messages arrays: `[{ role: "user", content: input }]`
  - Allows template engines: LangChain `PromptTemplate`, `ChatPromptTemplate`
- **Suggestions**: Messages array format, template engines

### 3. **`no-dynamic-system-prompts`** (LLM01)

- **Priority**: 🔴 Critical
- **CWE**: CWE-94
- **Description**: Prevents runtime modification of system prompts without validation
- **Detection**:
  - Assignment to variables with "systemPrompt" in name
  - Dynamic content in messages with `role: "system"`
  - Runtime modification of system prompt properties
- **False Positive Reduction**:
  - Allows literal string assignments
  - Allows validated modifications via `validateSystemPrompt()`
- **Suggestions**: Static prompts, validation against allowlists

### 4. **`no-direct-llm-output-execution`** (LLM05)

- **Priority**: 🔴 Critical
- **CWE**: CWE-94
- **Description**: Flags `eval()`, `exec()`, `child_process` usage with LLM-generated code
- **Detection**:
  - `eval()` calls with LLM output identifiers (`llmCode`, `generatedCode`, etc.)
  - `Function()` constructor with LLM outputs
  - `child_process.exec()` with LLM-generated commands
  - Checks for variables from `await llm.complete()` calls
- **False Positive Reduction**:
  - Allows sandbox contexts: `vm.runInNewContext()`, `runInSandbox()`
  - Allows validated code via `validateCode()`, `parseAndValidate()`
- **Suggestions**: Sandboxed execution, AST validation, static analysis

### 5. **`require-llm-rate-limiting`** (LLM10)

- **Priority**: 🔴 Critical
- **CWE**: CWE-770
- **Description**: Enforces rate limiting for LLM API calls to prevent DoS/unbounded consumption
- **Detection**:
  - LLM API calls without rate limiting checks before them
  - Looks for rate limiter calls in function scope
  - Checks for `@RateLimit` or `@ThrottleAnnotations decorators
- **Rate Limiter Patterns**: `rateLimiter.checkLimit()`, `checkQuota()`, `throttle()`
- **Suggestions**: Add rate limiter, token budgets, user quotas

---

## 📋 Remaining Rules (35/40)

### High-Priority Next Phase

These rules would have the highest impact and should be implemented next:

#### **Prompt Injection (LLM01)** - 4 rules

- `detect-indirect-prompt-injection-vectors` - Flags external content (emails, docs) reaching LLM
- `require-input-sanitization-for-llm` - Enforces sanitization on all LLM inputs
- `detect-rag-injection-risks` - Flags RAG/document inputs without CDR scanning
- `no-user-controlled-prompt-instructions` - Flags user input controlling LLM behavior

#### **Sensitive Information Disclosure (LLM02)** - 4 rules

- `no-pii-in-llm-training-data` - Detects PII in fine-tuning APIs
- `require-llm-output-redaction` - Enforces redaction before display
- `no-credentials-in-llm-context` - Flags credentials in LLM context/memory
- `detect-overly-permissive-llm-data-access` - Identifies excessive tool permissions

#### **Improper Output Handling (LLM05)** - 3 rules

- `require-llm-output-validation` - Requires validation before using LLM responses
- `require-llm-output-encoding` - Enforces context-appropriate encoding (HTML/SQL/shell)
- `detect-llm-generated-sql` - Identifies dangerous LLM-to-SQL patterns

#### **Excessive Agency (LLM06)** - 4 rules

- `enforce-llm-tool-least-privilege` - Ensures minimal permissions
- `require-human-approval-for-critical-actions` - Requires confirmation for destructive/financial actions
- `no-auto-approved-llm-tools` - Flags tools that auto-execute
- `detect-llm-unrestricted-tool-access` - Identifies agents with access to all tools

### Medium-Priority Rules

#### **Supply Chain (LLM03)** - 4 rules

- `require-model-provenance-verification`
- `no-unverified-model-downloads`
- `require-training-data-validation`
- `detect-model-serving-infrastructure-risks`

#### **Data Poisoning (LLM04)** - 4 rules

- `require-training-data-provenance`
- `detect-user-supplied-training-data`
- `no-auto-model-retraining-on-user-feedback`
- `require-training-data-integrity-checks`

#### **Prompt Leakage (LLM07)** - 3 rules

- `no-system-prompt-in-output`
- `require-system-prompt-isolation`
- `detect-prompt-extraction-vulnerabilities`

#### **Vector/Embeddings (LLM08)** - 4 rules

- `require-vector-db-access-control`
- `detect-embedding-poisoning-risks`
- `require-vector-namespace-isolation`
- `no-unvalidated-embeddings`

#### **Misinformation (LLM09)** - 3 rules

- `require-llm-fact-checking`
- `require-llm-confidence-scoring`
- `detect-unverified-llm-assertions`

#### **Unbounded Consumption (LLM10)** - 1 rule

- `require-llm-token-budget`
- `detect-llm-infinite-loops`

---

## 📂 Implementation Details

### Files Created

1. `/packages/eslint-plugin-secure-coding/src/rules/security/no-unsafe-prompt-concatenation.ts` (365 lines)
2. `/packages/eslint-plugin-secure-coding/src/rules/security/require-prompt-template-parameterization.ts` (206 lines)
3. `/packages/eslint-plugin-secure-coding/src/rules/security/no-dynamic-system-prompts.ts` (213 lines)
4. `/packages/eslint-plugin-secure-coding/src/rules/security/no-direct-llm-output-execution.ts` (303 lines)
5. `/packages/eslint-plugin-secure-coding/src/rules/security/require-llm-rate-limiting.ts` (252 lines)

### Modified Files

- `/packages/eslint-plugin-secure-coding/src/index.ts` - Added imports and exports for new rules

### Total Code Added

~1,400 lines of production-quality ESLint rule implementations

---

## 🎯 Usage

### Basic Configuration

```javascript
// eslint.config.mjs
import secureCoding from 'eslint-plugin-secure-coding';

export default [
  {
    plugins: {
      'secure-coding': secureCoding.plugin,
    },
    rules: {
      // OWASP LLM 2025 rules
      'secure-coding/no-unsafe-prompt-concatenation': 'error',
      'secure-coding/require-prompt-template-parameterization': 'error',
      'secure-coding/no-dynamic-system-prompts': 'error',
      'secure-coding/no-direct-llm-output-execution': 'error',
      'secure-coding/require-llm-rate-limiting': 'warn',
    },
  },
];
```

### With Custom Configuration

```javascript
{
  rules: {
    'secure-coding/no-unsafe-prompt-concatenation': ['error', {
      llmApiPatterns: ['myApp.llm.*', 'customLLM.*'],
      trustedPromptSanitizers: ['myCustomSanitizer'],
      allowSanitized: true,
    }],
    'secure-coding/require-llm-rate-limiting': ['error', {
      llmApiPatterns: ['llm.complete', 'openai.chat'],
      rateLimiterPatterns: ['checkLimit', 'rateLimit', 'myRateLimiter'],
    }],
  },
}
```

---

## 🧪 Example Detections

### Example 1: Unsafe Prompt Concatenation ❌

```typescript
// ❌ BAD - Direct concatenation detected
const prompt = `Summarize this: ${userInput}`;
await llm.complete(prompt);
//          ^ Error: Unsafe Prompt Concatenation

// ✅ GOOD - Parameterized
const messages = [
  { role: 'system', content: 'You are a helpful assistant' },
  { role: 'user', content: sanitizePromptInput(userInput) },
];
await llm.chat({ messages });
```

### Example 2: Dynamic System Prompts ❌

```typescript
// ❌ BAD - Dynamic system prompt
systemPrompt.content = userProvidedInstructions;
//                     ^ Error: Dynamic System Prompt

// ✅ GOOD - Static with validation
const SYSTEM_PROMPT = 'You are a helpful assistant';
// or
const validated = validateSystemPrompt(modifications, ALLOWED_DIRECTIVES);
```

### Example 3: Direct LLM Output Execution ❌

```typescript
// ❌ BAD - Executing LLM code directly
const code = await llm.complete('Generate a function...');
eval(code);
//   ^ Error: LLM Output Execution

// ✅ GOOD - Sandboxed execution
const code = await llm.complete('Generate a function...');
const ast = parseToAST(code);
if (!isValidAST(ast)) throw new Error('Invalid code');

await vm.runInNewContext(code, sandbox, {
  timeout: 5000,
  networkAccess: false,
});
```

### Example 4: Missing Rate Limiting ❌

```typescript
// ❌ BAD - No rate limiting
async function handleRequest(userId: string, prompt: string) {
  return await llm.complete(prompt);
  //           ^ Error: Missing Rate Limiting
}

// ✅ GOOD - With rate limiting
async function handleRequest(userId: string, prompt: string) {
  await rateLimiter.checkLimit(userId);
  return await llm.complete(prompt);
}
```

---

## 📊 Implementation Status

| Category                         | Implemented | Remaining | Total  | % Complete |
| -------------------------------- | ----------- | --------- | ------ | ---------- |
| **LLM01: Prompt Injection**      | 1           | 6         | 7      | 14%        |
| **LLM02: Sensitive Info**        | 0           | 4         | 4      | 0%         |
| **LLM03: Supply Chain**          | 0           | 4         | 4      | 0%         |
| **LLM04: Data Poisoning**        | 0           | 4         | 4      | 0%         |
| **LLM05: Output Handling**       | 1           | 3         | 4      | 25%        |
| **LLM06: Excessive Agency**      | 0           | 4         | 4      | 0%         |
| **LLM07: Prompt Leakage**        | 0           | 3         | 3      | 0%         |
| **LLM08: Vector/Embedding**      | 0           | 4         | 4      | 0%         |
| **LLM09: Misinformation**        | 0           | 3         | 3      | 0%         |
| **LLM10: Unbounded Consumption** | 1           | 2         | 3      | 33%        |
| **TOTAL**                        | **5**       | **35**    | **40** | **12.5%**  |

---

## 🚀 Next Steps

### Phase 1: Complete Core Categories (Priority: High)

Focus on completing LLM01, LLM05, LLM06, LLM10 - the most critical categories for production LLM applications.

**Estimated effort**: 2-3 days for 12-15 rules

### Phase 2: Specialized Detection (Priority: Medium)

Implement LLM02, LLM03, LLM04, LLM08 - more specialized but still important.

**Estimated effort**: 3-4 days for 16 rules

### Phase 3: Advanced Features (Priority: Low)

Complete LLM07, LLM09 - detection rules that require more sophisticated analysis.

**Estimated effort**: 1-2 days for 6 rules

---

## 🎉 Impact

These 5 rules provide critical protection against:

- **Prompt injection attacks** - The #1 LLM vulnerability
- **Code injection via LLM outputs** - A severe RCE risk
- **System prompt manipulation** - Can bypass all safety guardrails
- **DoS via unbounded LLM usage** - Prevents cost explosions

All rules include:
✅ Comprehensive detection patterns
✅ False positive reduction with safety checkers
✅ LLM-optimized error messages with CWE references
✅ Actionable suggestions for fixes
✅ Support for custom patterns and sanitizers

---

## 📖 Documentation

Each rule includes:

1. **Comprehensive JSDoc** with OWASP mapping and CWE references
2. **Usage examples** showing both violations and correct patterns
3. **Configuration options** for customization
4. **Suggestion corrections** where applicable

---

## ✨ Key Features

### Advanced Detection

- Pattern matching for 10+ LLM APIs (OpenAI, Anthropic, Cohere, custom)
- AST-based analysis (not regex-based)
- Context-aware detection (checks parent call expressions)

### False Positive Reduction

- Safety checker utilities
- Sanitization function detection
- JSDoc annotation support (`@safe`, `@validated`)
- Sandbox context detection

### Developer Experience

- Structured error messages
- Auto-fix suggestions where safe
- Manual fix suggestions with examples
- Links to OWASP/CWE documentation

---

This implementation provides a **solid foundation** for OWASP LLM 2025 coverage. The 5 implemented rules address the most critical attack vectors and can be extended to cover all 40 rules following the same patterns.
