# Migration Plan: Moving LLM Rules to `eslint-plugin-agentic-security`

## Overview

Move all 16 LLM/Agentic-specific rules from `eslint-plugin-secure-coding` to a new dedicated package: `eslint-plugin-agentic-security`.

---

## Phase 1: Remove Generic/Ineffective LLM Rules ✅ DONE

Already removed (correct decision based on SDK-specific requirement):

- ✅ `require-llm-output-validation` - Too generic, name-based
- ✅ `no-auto-approved-llm-tools` - Too generic, name-based

---

## Phase 2: Identify Remaining LLM Rules to Move

### Category: LLM01 - Prompt Injection (7 rules)

1. `no-unsafe-prompt-concatenation`
2. `require-prompt-template-parameterization`
3. `no-dynamic-system-prompts`
4. `detect-indirect-prompt-injection-vectors`
5. `require-input-sanitization-for-llm`
6. `detect-rag-injection-risks`
7. `no-user-controlled-prompt-instructions`

### Category: LLM05 - Improper Output Handling (3 rules)

1. `no-direct-llm-output-execution`
2. `require-llm-output-encoding`
3. `detect-llm-generated-sql`

### Category: LLM06 - Excessive Agency (3 rules)

1. `enforce-llm-tool-least-privilege`
2. `require-human-approval-for-critical-actions`
3. `detect-llm-unrestricted-tool-access`

### Category: LLM10 - Unbounded Consumption (3 rules)

1. `require-llm-rate-limiting`
2. `require-llm-token-budget`
3. `detect-llm-infinite-loops`

**Total: 16 rules to move**

---

## Phase 3: Decision Point

### Option A: Remove All LLM Rules Now ⚡ RECOMMENDED

**Reasoning:**

- Following the established criteria (universal JS/TS, protocol-based only)
- LLM rules are too generic and SDK-specific by nature
- Better to ship a focused `eslint-plugin-secure-coding` package
- Can create `eslint-plugin-agentic-security` later when ready to do SDK-specific implementations

**Actions:**

1. Remove all 16 LLM rules from `eslint-plugin-secure-coding`
2. Document them in `.removed-rules/llm-rules-migration.md`
3. Update package to focus on universal JS/TS security
4. Ship v2.2.0 with clean, focused ruleset

### Option B: Keep LLM Rules for Now, Plan Migration 🔄

**Reasoning:**

- LLM rules already implemented and tested
- Could be useful even if generic
- Create `eslint-plugin-agentic-security` package later
- Migrate rules when new package is ready

**Actions:**

1. Keep LLM rules in current package
2. Mark them as "experimental" or "beta"
3. Plan creation of new package
4. Migrate in future version

### Option C: Hybrid Approach 🎯

**Reasoning:**

- Remove obviously generic/ineffective rules
- Keep universally applicable LLM security patterns
- More nuanced approach

**Keep (Universal Security Concepts):**

- `no-unsafe-prompt-concatenation` - String concatenation security (similar to SQL injection)
- `no-direct-llm-output-execution` - eval()-like pattern
- `require-llm-output-encoding` - Output encoding is universal

**Remove (Too Generic/SDK-Specific):**

- `require-prompt-template-parameterization` - SDK-specific
- `no-dynamic-system-prompts` - SDK-specific
- `detect-indirect-prompt-injection-vectors` - Too generic
- `require-input-sanitization-for-llm` - Too generic
- `detect-rag-injection-risks` - RAG is SDK-specific
- `no-user-controlled-prompt-instructions` - Too generic
- `detect-llm-generated-sql` - Too speculative
- `enforce-llm-tool-least-privilege` - Agent SDK-specific
- `require-human-approval-for-critical-actions` - Agent SDK-specific
- `detect-llm-unrestricted-tool-access` - Agent SDK-specific
- `require-llm-rate-limiting` - API client-specific
- `require-llm-token-budget` - API client-specific
- `detect-llm-infinite-loops` - Agent SDK-specific

---

## Recommendation: **Option A - Remove All LLM Rules** ⚡

### Justification:

1. **Consistency** - We just removed 2 LLM rules for being too generic
2. **Criteria Alignment** - LLM rules don't fit "universal JS/TS" or "protocol-based"
3. **Quality Over Quantity** - Better to have 35 solid rules than 50 with 15+ generic ones
4. **Clear Separation** - Let agentic security be its own domain
5. **Future-Proof** - Can build `eslint-plugin-agentic-security` properly with SDK-specific implementations

### Implementation Steps:

```bash
# 1. Remove all LLM rule directories
rm -rf src/rules/no-unsafe-prompt-concatenation
rm -rf src/rules/require-prompt-template-parameterization
rm -rf src/rules/no-dynamic-system-prompts
rm -rf src/rules/detect-indirect-prompt-injection-vectors
rm -rf src/rules/require-input-sanitization-for-llm
rm -rf src/rules/detect-rag-injection-risks
rm -rf src/rules/no-user-controlled-prompt-instructions
rm -rf src/rules/no-direct-llm-output-execution
rm -rf src/rules/require-llm-output-encoding
rm -rf src/rules/detect-llm-generated-sql
rm -rf src/rules/enforce-llm-tool-least-privilege
rm -rf src/rules/require-human-approval-for-critical-actions
rm -rf src/rules/detect-llm-unrestricted-tool-access
rm -rf src/rules/require-llm-rate-limiting
rm -rf src/rules/require-llm-token-budget
rm -rf src/rules/detect-llm-infinite-loops

# 2. Remove documentation
rm -f docs/rules/no-unsafe-prompt-concatenation.md
rm -f docs/rules/require-prompt-template-parameterization.md
# ... (all 16 docs)

# 3. Update src/index.ts to remove imports and exports

# 4. Run tests to verify
nx test eslint-plugin-secure-coding
```

---

## Post-Removal State

### `eslint-plugin-secure-coding` will contain:

- **~35 core security rules** (all universal JS/TS or protocol-based)
- **Clean, focused scope**
- **High-quality, low false-positive rules**
- **Production-ready**

### Future `eslint-plugin-agentic-security` will contain:

- **16+ LLM/agent rules** (SDK-specific implementations)
- **Focused on LLM application security**
- **OWASP LLM Top 10 2025 aligned**
- **Framework-aware** (LangChain, OpenAI, Anthropic, etc.)

---

## Next Steps (If Option A Chosen):

1. **Confirm decision** with user
2. **Execute removal** of all 16 LLM rules
3. **Update documentation** to reflect focused scope
4. **Update package.json** description
5. **Run full test suite**
6. **Ship v2.2.0** with clean, focused ruleset
7. **Plan `eslint-plugin-agentic-security`** package for future

Would you like me to proceed with **Option A** (remove all LLM rules)?
