# Comprehensive Fix Plan: eslint-plugin-agentic-security

## Phase 1: Fix Failing Test Logic (Priority Order)

### Group A: Pattern Detection Issues (8 rules)

1. ✅ `detect-llm-infinite-loops` - FIXED (counter detection)
2. ✅ `detect-indirect-prompt-injection-vectors` - FIXED (duplicate reporting)
3. ⚠️ `detect-rag-injection-risks` - IN PROGRESS (sanitizer detection)
4. ⚠️ `require-llm-token-budget` - IN PROGRESS (token limit detection)
5. ❌ `no-unsafe-prompt-concatenation` - NEEDS FIX (LLM API detection)
6. ❌ `require-prompt-template-parameterization` - NEEDS FIX (template detection)
7. ❌ `require-input-sanitization-for-llm` - NEEDS FIX (sanitization check)
8. ❌ `require-llm-output-encoding` - NEEDS FIX (encoding detection)

### Group B: Assignment/Configuration Issues (3 rules)

9. ❌ `no-dynamic-system-prompts` - NEEDS FIX (dynamic detection)
10. ❌ `no-user-controlled-prompt-instructions` - NEEDS FIX (variable tracking)
11. ✅ `require-human-approval-for-critical-actions` - FIXED (approval regex)

### Group C: Low Coverage - Need Test Implementation (3 rules)

12. ❌ `no-pii-in-llm-training-data` - 30% coverage (needs tests)
13. ❌ `require-llm-output-redaction` - 42% coverage (needs tests)
14. ❌ `no-credentials-in-llm-context` - 37% coverage (needs tests)
15. ❌ `no-direct-llm-output-execution` - 63% coverage (needs tests)
16. ❌ `detect-overly-permissive-llm-data-access` - 33% coverage (needs tests)

## Phase 2: Test Enhancement Strategy

For each low-coverage rule:

- Add valid test cases (5-10 cases)
- Add invalid test cases (5-10 cases)
- Cover edge cases and boundary conditions
- Target: >90% branch coverage

## Phase 3: Documentation Review

- Ensure all rules have clear descriptions
- Add examples to README
- Document configuration options
- Add troubleshooting guide

## Current Status

- **Test Files**: 15 failed | 5 passed (20 total)
- **Coverage**: 83.68% → Target: 90%+
- **Tests**: 31 failed | 114 passed (145 total)
