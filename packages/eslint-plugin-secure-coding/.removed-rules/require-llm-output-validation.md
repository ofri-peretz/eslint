# Removal of `require-llm-output-validation` Rule

## Summary

Removed the generic `require-llm-output-validation` ESLint rule as it was not effective or relevant in its current form.

## Rationale

The rule had fundamental issues that made it impractical for production use:

### 1. **Name-Based Detection is Unreliable**

- The rule triggered on any variable named `response`, `completion`, or `result`
- This would cause massive false positives in any real codebase
- Any HTTP response, Promise completion, or function result would trigger the rule

### 2. **Misses Actual LLM Outputs**

- If developers name their OpenAI response `aiResult`, `llmReply`, or any non-standard name, it won't catch it
- Relies entirely on naming conventions rather than actual API usage

### 3. **Not SDK-Specific**

- Doesn't understand actual SDK APIs (OpenAI, Anthropic, LangChain, etc.)
- Can't detect actual LLM API calls or their specific response structures
- Generic approach doesn't account for SDK-specific patterns

### 4. **Validation Check Too Broad**

- Just looks for patterns like `validate` or `.parse` without understanding the actual validation libraries
- Doesn't verify if the validation is actually appropriate for LLM output

## Better Approach

SDK-specific rules that understand actual APIs:

1. **`require-openai-output-validation`**
   - Detects `openai.chat.completions.create()` calls
   - Ensures response is validated with schema validation (Zod, etc.)
   - Understands OpenAI response structure

2. **`require-anthropic-output-validation`**
   - Specific to Claude SDK patterns
   - Understands Anthropic message structure

3. **`require-langchain-output-validation`**
   - For LangChain chains and agents
   - Validates output parsers are used

## Files Removed

- `/src/rules/require-llm-output-validation/index.ts`
- `/src/rules/require-llm-output-validation/require-llm-output-validation.test.ts`
- `/docs/rules/require-llm-output-validation.md`

## Changes Made

- Removed import from `/src/index.ts`
- Removed export from rules object
- Updated rule count from 19 to 18 LLM rules
- Updated LLM05 category from 4 to 3 rules

## Impact

- **No breaking changes** for users who weren't using this rule
- Users who had this rule enabled will need to remove it from their config
- Paves the way for more effective, SDK-specific validation rules

## Next Steps

Consider implementing SDK-specific validation rules:

- Research common LLM SDKs used in production
- Design rules that understand actual API patterns
- Implement data flow analysis to track LLM responses through code
- Support popular validation libraries (Zod, Yup, Joi, etc.)
