# LLM Rules Review & Migration Plan

## Current LLM Rules in `eslint-plugin-secure-coding` (18 total)

### LLM01: Prompt Injection (7 rules)

#### ✅ **KEEP & Move to `eslint-plugin-agentic-security`**

1. **`no-unsafe-prompt-concatenation`**
   - **Generic**: ✅ Detects string concatenation in prompts
   - **Verifiable**: ✅ Can detect syntactic patterns
   - **Action**: Move to agentic-security
   - **Reason**: Framework-agnostic, detects unsafe patterns

2. **`require-prompt-template-parameterization`**
   - **Generic**: ✅ Encourages template parameters
   - **Verifiable**: ✅ Can detect template literal patterns
   - **Action**: Move to agentic-security
   - **Reason**: Framework-agnostic best practice

3. **`no-dynamic-system-prompts`**
   - **Generic**: ✅ Detects dynamic system prompt construction
   - **Verifiable**: ✅ Can detect variable assignments in system prompts
   - **Action**: Move to agentic-security
   - **Reason**: Framework-agnostic security pattern

4. **`detect-indirect-prompt-injection-vectors`**
   - **Generic**: ✅ Detects external data sources in prompts
   - **Verifiable**: ⚠️ Partial - can detect patterns like `fetch()` + prompt usage
   - **Action**: Move to agentic-security
   - **Reason**: Generic pattern, though limited in verification

5. **`require-input-sanitization-for-llm`**
   - **Generic**: ❌ Too vague - "sanitization" means different things
   - **Verifiable**: ❌ Cannot verify if sanitization is effective
   - **Action**: ⚠️ **DROP or make SDK-specific**
   - **Reason**: Cannot verify actual sanitization effectiveness

6. **`detect-rag-injection-risks`**
   - **Generic**: ✅ Detects RAG patterns with user input
   - **Verifiable**: ⚠️ Partial - can detect vector DB + user input patterns
   - **Action**: Move to agentic-security
   - **Reason**: Framework-agnostic RAG pattern detection

7. **`no-user-controlled-prompt-instructions`**
   - **Generic**: ✅ Detects user input in prompt instructions
   - **Verifiable**: ✅ Can detect syntactic patterns
   - **Action**: Move to agentic-security
   - **Reason**: Framework-agnostic security pattern

---

### LLM05: Improper Output Handling (4 rules)

#### ✅ **KEEP & Move to `eslint-plugin-agentic-security`**

8. **`no-direct-llm-output-execution`**
   - **Generic**: ✅ Detects `eval()` or `Function()` with LLM output
   - **Verifiable**: ✅ Can detect syntactic patterns
   - **Action**: Move to agentic-security
   - **Reason**: Framework-agnostic, critical security pattern

9. **`require-llm-output-validation`**
   - **Generic**: ❌ "Validation" is too vague
   - **Verifiable**: ❌ Cannot verify validation effectiveness
   - **Action**: ⚠️ **DROP or redesign**
   - **Reason**: Same problem as `require-input-sanitization-for-llm`

10. **`require-llm-output-encoding`**
    - **Generic**: ⚠️ Context-dependent (HTML vs SQL vs Shell)
    - **Verifiable**: ⚠️ Can detect specific encoding functions
    - **Action**: ⚠️ **Redesign or make context-specific**
    - **Reason**: Needs specific context (e.g., `no-unsanitized-html` already covers HTML)

11. **`detect-llm-generated-sql`**
    - **Generic**: ✅ Detects LLM output used in SQL
    - **Verifiable**: ✅ Can detect syntactic patterns
    - **Action**: Move to agentic-security
    - **Reason**: Framework-agnostic, critical security pattern

---

### LLM06: Excessive Agency (4 rules)

#### ✅ **KEEP & Move to `eslint-plugin-agentic-security`**

12. **`enforce-llm-tool-least-privilege`**
    - **Generic**: ✅ Encourages least-privilege tool definitions
    - **Verifiable**: ⚠️ Partial - can detect tool definitions without restrictions
    - **Action**: Move to agentic-security
    - **Reason**: Framework-agnostic agentic pattern

13. **`require-human-approval-for-critical-actions`**
    - **Generic**: ✅ Detects critical actions without approval gates
    - **Verifiable**: ⚠️ Partial - can detect patterns, but "critical" is configurable
    - **Action**: Move to agentic-security
    - **Reason**: Framework-agnostic agentic pattern

14. **`no-auto-approved-llm-tools`**
    - **Generic**: ✅ Detects auto-approved tool calls
    - **Verifiable**: ⚠️ Partial - can detect missing approval checks
    - **Action**: Move to agentic-security
    - **Reason**: Framework-agnostic agentic pattern

15. **`detect-llm-unrestricted-tool-access`**
    - **Generic**: ✅ Detects unrestricted tool access
    - **Verifiable**: ⚠️ Partial - can detect missing access controls
    - **Action**: Move to agentic-security
    - **Reason**: Framework-agnostic agentic pattern

---

### LLM10: Unbounded Consumption (3 rules)

#### ❌ **DROP - SDK-Specific, Not Verifiable**

16. **`require-llm-rate-limiting`**
    - **Generic**: ❌ Rate limiting is implementation-specific
    - **Verifiable**: ❌ Cannot verify rate limiting effectiveness
    - **Action**: ⚠️ **DROP**
    - **Reason**: Cannot verify with static analysis

17. **`require-llm-token-budget`**
    - **Generic**: ❌ SDK-specific parameter names (`max_tokens` vs `maxTokens`)
    - **Verifiable**: ❌ Cannot verify arbitrary function names like `checkTokenBudget`
    - **Action**: ❌ **DROP from secure-coding**
    - **Next**: **Implement SDK-specific versions:**
      - `eslint-plugin-openai-security`: Check for `max_tokens` parameter
      - `eslint-plugin-anthropic-security`: Check for `max_tokens` parameter
      - `eslint-plugin-google-ai-security`: Check for `maxOutputTokens` parameter

18. **`detect-llm-infinite-loops`**
    - **Generic**: ✅ Detects potential infinite loops in LLM interactions
    - **Verifiable**: ⚠️ Partial - can detect missing iteration limits
    - **Action**: Move to agentic-security
    - **Reason**: Framework-agnostic pattern detection

---

## Summary & Migration Plan

### ✅ Move to `eslint-plugin-agentic-security` (13 rules)

Generic, verifiable (or partially verifiable) agentic patterns:

1. `no-unsafe-prompt-concatenation`
2. `require-prompt-template-parameterization`
3. `no-dynamic-system-prompts`
4. `detect-indirect-prompt-injection-vectors`
5. `detect-rag-injection-risks`
6. `no-user-controlled-prompt-instructions`
7. `no-direct-llm-output-execution`
8. `detect-llm-generated-sql`
9. `enforce-llm-tool-least-privilege`
10. `require-human-approval-for-critical-actions`
11. `no-auto-approved-llm-tools`
12. `detect-llm-unrestricted-tool-access`
13. `detect-llm-infinite-loops`

### ⚠️ Redesign or Drop (3 rules)

Cannot verify with static analysis:

1. **`require-input-sanitization-for-llm`** - ❌ DROP (cannot verify sanitization)
2. **`require-llm-output-validation`** - ❌ DROP (cannot verify validation)
3. **`require-llm-output-encoding`** - ⚠️ MERGE into existing rules (e.g., `no-unsanitized-html`)

### ❌ Drop & Recreate as SDK-Specific (2 rules)

Move to SDK-specific plugins:

1. **`require-llm-rate-limiting`** - ❌ DROP (not verifiable statically)
2. **`require-llm-token-budget`** - ❌ DROP from secure-coding
   - ✅ **Create** `openai-security/require-max-tokens`
   - ✅ **Create** `anthropic-security/require-max-tokens`
   - ✅ **Create** `google-ai-security/require-max-output-tokens`

---

## Next Steps

1. **Create migration script** to move 13 rules to `eslint-plugin-agentic-security`
2. **Drop 5 unverifiable rules** from `eslint-plugin-secure-coding`
3. **Create SDK-specific token budget rules** in each SDK plugin
4. **Update documentation** to explain the split
5. **Create deprecation notices** for removed rules

---

## Files to Modify

### Remove from `eslint-plugin-secure-coding`:

- `src/rules/security/require-input-sanitization-for-llm.ts`
- `src/rules/security/require-llm-output-validation.ts`
- `src/rules/security/require-llm-output-encoding.ts`
- `src/rules/security/require-llm-rate-limiting.ts`
- `src/rules/security/require-llm-token-budget.ts`
- Corresponding test files

### Move to `eslint-plugin-agentic-security`:

- 13 rule files + tests + documentation

### Create in SDK plugins:

- `eslint-plugin-openai-security/src/rules/openai/require-max-tokens.ts`
- `eslint-plugin-anthropic-security/src/rules/anthropic/require-max-tokens.ts`
- `eslint-plugin-google-ai-security/src/rules/google-ai/require-max-output-tokens.ts`
