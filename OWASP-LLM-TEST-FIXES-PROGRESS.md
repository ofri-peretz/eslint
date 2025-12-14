# Test Fixes - Progress Tracker

## Status: IN PROGRESS

### Completed (1/35)

- ✅ enforce-llm-tool-least-privilege.test.ts - Fixed `function` keyword syntax error

### Remaining (34/35)

#### Priority 1: Rules Too Strict (Need to relax detection) - 20 failures

**require-llm-rate-limiting.test.ts** (4 failures):

- [ ] Recognize `rateLimiter.checkLimit()` pattern
- [ ] Recognize `quotaManager.consumeQuota()` pattern
- [ ] Recognize `checkQuota()` pattern
- [ ] Recognize `rateLimit.check()` pattern

**require-llm-output-validation.test.ts** (3 failures):

- [ ] Track validated variables through assignment
- [ ] Recognize `schema.parse()` as validation
- [ ] Don't flag validated identifiers

**detect-rag-injection-risks.test.ts** (3 failures):

- [ ] Recognize `scanDocument()` as safety function
- [ ] Recognize `cdr.process()` as safety function
- [ ] Recognize `contentFilter()` as safety function

**no-dynamic-system-prompts.test.ts** (2 failures):

- [ ] Add `validateSystemPrompt` to trusted validators
- [ ] Add `sanitizeSystemPrompt` to trusted validators

**no-auto-approved-llm-tools.test.ts** (1 failure):

- [ ] Check for `checkPolicy()` call before `executeTool()`

**require-human-approval-for-critical-actions.test.ts** (2 failures):

- [ ] Recognize `if (approved)` pattern
- [ ] Recognize `if (await confirmed())` pattern

#### Priority 2: Rules Too Lenient (Need to expand detection) - 14 failures

**no-unsafe-prompt-concatenation.test.ts** (8 failures):

- [ ] Detect template literals with user variables
- [ ] Detect string concatenation `+` operator
- [ ] Expand LLM API patterns (openai, anthropic, ai, chatCompletion)

**require-prompt-template-parameterization.test.ts** (3 failures):

- [ ] Detect template literals in openai.chat.completions.create
- [ ] Detect template literals in anthropic.complete
- [ ] Detect template literals in ai.complete

**no-user-controlled-prompt-instructions.test.ts** (2 failures):

- [ ] Detect `behavior =` assignments
- [ ] Detect `persona =` assignments

**detect-llm-unrestricted-tool-access.test.ts** (2 failures):

- [ ] Detect `allTools` pattern
- [ ] Detect `globalTools` pattern

**detect-rag-injection-risks.test.ts** (1 failure):

- [ ] Detect `retriever.getRelevantDocuments` pattern

---

## Fix Strategy

### Phase 1: Add Trusted Patterns (Quick Wins)

1. Add safety function patterns to rules
2. Add validation patterns

### Phase 2: Improve Context Tracking

1. Track variable assignments
2. Check for safety calls in same scope

### Phase 3: Expand Detection Patterns

1. Add more LLM API patterns
2. Add more risky patterns

---

**Started**: Dec 13, 2025 01:12  
**Target**: All tests passing
