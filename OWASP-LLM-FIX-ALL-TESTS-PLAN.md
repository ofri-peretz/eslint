# Test Fix Plan - Option A: Fix All Tests

## Goal

Get all 18 OWASP LLM rules to 100% test pass rate

## Progress Tracker

### ✅ Completed (3/35)

1. ✅ enforce-llm-tool-least-privilege - Fixed `function` keyword
2. ✅ no-dynamic-system-prompts - Added trusted sanitizers (2 failures)

### 🔄 In Progress (32/35)

#### Category 1: Rules Too Strict - Need Context Tracking

**require-llm-rate-limiting.ts** (4 failures) - HIGH PRIORITY

- [ ] Failure 1: Not recognizing `rateLimiter.checkLimit()` in function
- [ ] Failure 2: Not recognizing `quotaManager.consumeQuota()` in function
- [ ] Failure 3: Not recognizing `checkQuota()` in function
- [ ] Failure 4: Not recognizing `rateLimit.check()` in function

**require-llm-output-validation.ts** (3 failures) - HIGH PRIORITY

- [ ] Failure 1: Flagging `llmResponse` after `validateOutput()`
- [ ] Failure 2: Flagging `llmOutput` in `schema.parse()`
- [ ] Failure 3: Flagging `result` after parsing

**detect-rag-injection-risks.ts** (3 failures)

- [ ] Failure 1: Flagging after `scanDocument()`
- [ ] Failure 2: Flagging after `cdr.process()`
- [ ] Failure 3: Flagging after `contentFilter()`

**no-auto-approved-llm-tools.ts** (1 failure)

- [ ] Not seeing `checkPolicy()` before `executeTool()`

**require-human-approval-for-critical-actions.ts** (2 failures)

- [ ] Not recognizing `if (approved)` guard
- [ ] Not recognizing `if (await confirmed())` guard

#### Category 2: Rules Too Lenient - Need Pattern Expansion

**no-unsafe-prompt-concatenation.ts** (8 failures)

- [ ] Not detecting template literals (8 cases)

**require-prompt-template-parameterization.ts** (3 failures)

- [ ] Not detecting in openai.chat.completions.create
- [ ] Not detecting in anthropic.complete
- [ ] Not detecting in ai.complete

**no-user-controlled-prompt-instructions.ts** (2 failures)

- [ ] Not detecting `behavior =`
- [ ] Not detecting `persona =`

**detect-llm-unrestricted-tool-access.ts** (2 failures)

- [ ] Not detecting `allTools`
- [ ] Not detecting `globalTools`

**detect-indirect-prompt-injection-vectors.ts** (1 failure)

- [ ] Detecting both template + identifier (expected 1, got 2)

---

## Fix Strategy

### Phase 1: Fix Strictness Issues (Required for good UX)

Focus on reducing false positives - these frustrate users most

### Phase 2: Fix Leniency Issues (Required for security)

Expand detection to catch all vulnerability patterns

### Phase 3: Verify

Run full test suite, ensure 100% pass rate

---

**Started**: 07:51 AM, Dec 13, 2025
**Target**: 100% test pass rate (0 failures)
**ETA**: ~4-6 hours
