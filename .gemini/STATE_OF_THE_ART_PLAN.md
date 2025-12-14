# State-of-the-Art ESLint Plugin Implementation Plan

## eslint-plugin-agentic-security

> **Goal**: Create a production-ready, state-of-the-art ESLint plugin for agentic AI security
> **Target**: Industry-leading quality standards for security-focused ESLint plugins

---

## What Makes an ESLint Plugin "State-of-the-Art"?

### 1. **Accuracy & Reliability** (Critical)

- ✅ Zero false positives on valid code
- ✅ Catches all documented security patterns
- ✅ Handles edge cases gracefully
- ✅ Clear, actionable error messages

### 2. **Test Coverage** (Critical)

- ✅ >90% branch coverage (ideally 95%+)
- ✅ Comprehensive positive/negative test cases
- ✅ Edge case coverage
- ✅ Real-world scenario tests

### 3. **Documentation Excellence** (High Priority)

- ✅ Clear rule descriptions with security context
- ✅ Code examples (valid & invalid)
- ✅ Configuration options explained
- ✅ Migration guides for existing code

### 4. **Developer Experience** (High Priority)

- ✅ Helpful error messages (using formatLLMMessage ✅)
- ✅ Actionable fix suggestions
- ✅ Auto-fix capabilities where safe
- ✅ Performance (fast linting, no slowdowns)

### 5. **Security Best Practices** (Critical)

- ✅ Based on OWASP standards
- ✅ CWE references
- ✅ Industry-recognized patterns
- ✅ Real-world threat modeling

---

## Current State Analysis

### ✅ **Strengths**

1. All rules use `formatLLMMessage` (AI-friendly messages)
2. All rules have proper messageIds
3. OWASP LLM Top 10 2025 coverage
4. CWE references in place
5. Good rule categorization (20 rules across 5 categories)

### ⚠️ **Areas Needing Improvement**

1. **Test Pass Rate**: 15/20 test files failing
2. **Coverage**: 83.68% (below 90% target)
3. **Detection Logic**: Several rules have pattern matching issues
4. **Documentation**: Needs enhancement with examples
5. **Edge Cases**: Some rules don't handle all scenarios

---

## Implementation Plan (4 Phases)

### **Phase 1: Core Detection Logic Excellence** ⚡ CRITICAL

**Goal**: Fix all rule detection logic to be accurate and reliable

#### 1.1 Pattern Detection Rules (8 rules)

**Priority: HIGH** - These are the most complex and most likely to have issues

- [ ] `no-unsafe-prompt-concatenation` ⚠️ **8 test failures**
  - Issue: Not detecting LLM API calls in all contexts
  - Fix: Improve parent call detection, handle nested structures
  - Tests: Add cases for openai.chat.completions.create, anthropic.complete, etc.

- [ ] `require-prompt-template-parameterization` ⚠️ **3 test failures**
  - Issue: Not detecting template literals in message objects
  - Fix: Check object properties for template literals
  - Tests: Add OpenAI messages format, Anthropic format

- [ ] `require-input-sanitization-for-llm` ⚠️ **1 test failure**
  - Issue: Not detecting unsanitized user input patterns
  - Fix: Improve user input identifier detection
  - Tests: Add userQuery, userInput, user.\* patterns

- [ ] `require-llm-output-encoding` ⚠️ **1 test failure**
  - Issue: Not detecting LLM output in SQL/HTML contexts
  - Fix: Track LLM output variables through code flow
  - Tests: Add db.query, innerHTML, eval contexts

- [x] `detect-llm-infinite-loops` ✅ **FIXED**
- [x] `detect-indirect-prompt-injection-vectors` ✅ **FIXED**
- [x] `detect-rag-injection-risks` 🔄 **IN PROGRESS**
- [x] `require-llm-token-budget` 🔄 **IN PROGRESS**

#### 1.2 Assignment/Configuration Rules (3 rules)

**Priority: MEDIUM**

- [ ] `no-dynamic-system-prompts` ⚠️ **1 test failure**
  - Issue: Not detecting dynamic assignments to system prompts
  - Fix: Track assignment patterns for systemPrompt, systemMessage variables
  - Tests: Add config.systemPrompt, dynamic template cases

- [ ] `no-user-controlled-prompt-instructions` ⚠️ **2 test failures**
  - Issue: Not detecting user-controlled behavior/persona variables
  - Fix: Improve pattern matching for behavior/persona identifiers
  - Tests: Add userBehavior, userDefinedPersona patterns

- [x] `require-human-approval-for-critical-actions` ✅ **FIXED**

#### 1.3 Execution Safety Rules (1 rule)

**Priority: HIGH** - Security critical

- [ ] `no-direct-llm-output-execution` ⚠️ **2 test failures**
  - Issue: Not detecting eval/exec with LLM output
  - Fix: Track LLM response variables, check eval/Function/exec usage
  - Tests: Add response.code, completion.message.content patterns

---

### **Phase 2: Comprehensive Test Coverage** 📊

**Goal**: Achieve >90% coverage with real-world scenarios

#### 2.1 Low-Coverage Rules Enhancement

**Priority: HIGH**

- [ ] `no-pii-in-llm-training-data` (30% coverage)
  - Add 10+ valid cases
  - Add 10+ invalid cases
  - Cover: email, phone, SSN, credit card patterns
  - Test: redaction, anonymization, masking

- [ ] `require-llm-output-redaction` (42% coverage)
  - Add sensitive data redaction scenarios
  - Test: PII in responses, credential leakage
  - Cover: regex patterns, ML-based detection

- [ ] `no-credentials-in-llm-context` (37% coverage)
  - Test: API keys, passwords, tokens in prompts
  - Cover: environment variables, config files
  - Edge cases: base64 encoded, obfuscated credentials

- [ ] `detect-overly-permissive-llm-data-access` (33% coverage)
  - Test: database access patterns
  - Cover: SELECT \*, unrestricted queries
  - Edge cases: JOIN patterns, subqueries

- [ ] `no-direct-llm-output-execution` (63% coverage)
  - Add more eval/Function/exec scenarios
  - Test: dynamic imports, worker threads
  - Cover: sanitization, sandboxing

#### 2.2 Edge Case Testing

**Priority: MEDIUM**

For ALL rules, add tests for:

- [ ] Nested function calls
- [ ] Async/await patterns
- [ ] Promise chains
- [ ] Destructured assignments
- [ ] Spread operators
- [ ] Optional chaining (?.)
- [ ] Nullish coalescing (??)
- [ ] Template literal edge cases

---

### **Phase 3: Documentation Excellence** 📚

**Goal**: Create state-of-the-art documentation

#### 3.1 Rule Documentation (20 rules)

**Priority: MEDIUM**

For each rule create:

- [ ] Clear description with security context
- [ ] Why this matters (OWASP/CWE reference)
- [ ] 3-5 invalid code examples
- [ ] 3-5 valid code examples (with fixes)
- [ ] Configuration options explained
- [ ] When to disable (if ever)

#### 3.2 Package Documentation

**Priority: HIGH**

- [ ] Enhanced README.md
  - Quick start guide
  - Configuration examples
  - Rule overview table
  - Integration guides (Next.js, Express, etc.)
- [ ] AGENTS.md - AI Assistant Guide
  - How AI assistants should use these rules
  - Common patterns for fixes
  - Integration with AI coding tools

- [ ] SECURITY.md
  - Threat model
  - Coverage matrix (OWASP LLM Top 10)
  - Known limitations
  - Reporting vulnerabilities

#### 3.3 Examples & Guides

**Priority: MEDIUM**

- [ ] Create `examples/` directory
  - Good: Secure LLM integration patterns
  - Bad: Common vulnerabilities
  - Fixes: How to remediate

---

### **Phase 4: Polish & Performance** ⚡

**Goal**: Production-ready quality

#### 4.1 Performance Optimization

**Priority: LOW** (but important for adoption)

- [ ] Benchmark all rules
- [ ] Optimize regex patterns
- [ ] Cache AST traversals where possible
- [ ] Profile on large codebases

#### 4.2 Auto-Fix Implementation

**Priority: MEDIUM**

Add safe auto-fixes for:

- [ ] `no-unsafe-prompt-concatenation` → Convert to parameterized
- [ ] `require-input-sanitization-for-llm` → Add sanitization wrapper
- [ ] Simple pattern replacements

#### 4.3 Configuration Presets

**Priority: MEDIUM**

Create configuration presets:

- [ ] `recommended` - Balanced security/DX
- [ ] `strict` - Maximum security
- [ ] `owasp-llm-2025` - OWASP compliance focused

---

## Success Criteria

### Must Have (Blocking Release)

- ✅ All 20 test files passing (145/145 tests passing)
- ✅ >90% test coverage (targeting 95%+)
- ✅ All messageIds using formatLLMMessage ✅ DONE
- ✅ Zero false positives on valid patterns
- ✅ README with clear documentation

### Should Have (Quality)

- ✅ >95% test coverage
- ✅ Auto-fix for 5+ rules
- ✅ AGENTS.md guide
- ✅ Examples directory
- ✅ Performance benchmarks

### Nice to Have (Future)

- ⭐ VS Code extension
- ⭐ Interactive playground
- ⭐ CI/CD integration examples
- ⭐ Blog post / tutorial

---

## Execution Strategy

### Approach: Systematic & Thorough

1. **Fix one rule completely** before moving to next
2. **Test immediately** after each fix
3. **Document as we go** (not at the end)
4. **Iterate based on results**

### Time Estimate

- Phase 1: ~2-3 hours (15 rules to fix/verify)
- Phase 2: ~1-2 hours (test enhancement)
- Phase 3: ~1-2 hours (documentation)
- Phase 4: ~1 hour (polish)
  **Total: 5-8 hours for state-of-the-art quality**

### Next Steps (Immediate)

1. ✅ Run full test suite to get current baseline
2. ⚡ Fix all failing tests (Phase 1)
3. 📊 Add comprehensive tests (Phase 2)
4. 📚 Enhance documentation (Phase 3)
5. ⚡ Polish & optimize (Phase 4)

---

## Quality Gates

Before marking any rule as "complete":

- ✅ All tests passing for that rule
- ✅ Coverage >90% for that rule
- ✅ Documentation with examples
- ✅ No false positives on edge cases
- ✅ Reviewed manually with real code samples

---

## Current Progress Tracker

### Phase 1: Detection Logic

- ✅ Fixed: 3/20 rules
- 🔄 In Progress: 2/20 rules
- ⏳ Remaining: 15/20 rules
- **Progress: 15%**

**Next 5 Rules to Fix (Priority Order):**

1. `no-unsafe-prompt-concatenation` (8 failures) 🔥
2. `require-prompt-template-parameterization` (3 failures)
3. `no-user-controlled-prompt-instructions` (2 failures)
4. `no-direct-llm-output-execution` (2 failures)
5. `no-dynamic-system-prompts` (1 failure)

---

**Let's build something truly excellent! 🚀**
