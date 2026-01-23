# Agentic Security Plugin Test Fixes

## Summary

This document tracks the fixes needed for the eslint-plugin-agentic-security package to achieve:

1. All tests passing
2. Coverage above 90%
3. Proper messageIds usage ✅ (all rules already use messageIds)
4. formatLLMMessage usage ✅ (all rules already use formatLLMMessage)

## Current Status

- **Test Files**: 17 failed | 3 passed (20)
- **Tests**: 36 failed | 109 passed (145)
- **Coverage**: 83.5% (need 90%)

## Failing Rules

### 1. detect-llm-infinite-loops

**Issue**: Loop with counter `iteration++` not recognized as safe
**Fix**: Update loop analysis to detect counter variables
**Files**:

- `src/rules/detect-llm-infinite-loops/index.ts`
- `src/rules/detect-llm-infinite-loops/detect-llm-infinite-loops.test.ts`

### 2. detect-indirect-prompt-injection-vectors

**Issue**: Reporting 2 errors (TemplateLiteral + Identifier) when only 1 expected
**Fix**: Don't report both the template literal and its expressions
**Files**:

- `src/rules/detect-indirect-prompt-injection-vectors/index.ts`

### 3. detect-rag-injection-risks

**Issue**: Not recognizing `contentFilter` as a sanitizer
**Fix**: Add `contentFilter` to default sanitizers or improve sanitizer detection
**Files**:

- `src/rules/detect-rag-injection-risks/index.ts`

### 4. require-llm-token-budget

**Issue**: Not recognizing `getTokenLimit` in if condition
**Fix**: Check if-statement conditions for token limit variables
**Files**:

- `src/rules/require-llm-token-budget/index.ts`

### 5. Low Coverage Rules (need more tests)

- **detect-overly-permissive-llm-data-access**: 33.33% statements, 0% branch
- **no-credentials-in-llm-context**: 37.5% statements, 12.5% branch
- **no-pii-in-llm-training-data**: 30% statements, 0% branch
- **require-llm-output-redaction**: 42.85% statements, 16.66% branch
- **no-direct-llm-output-execution**: 63.23% statements, 59.7% branch

## Action Plan

1. Fix the 4 failing test rules
2. Add comprehensive test cases for low-coverage rules
3. Review and enhance documentation
