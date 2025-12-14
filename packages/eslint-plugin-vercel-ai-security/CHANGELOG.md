# Changelog

All notable changes to `eslint-plugin-vercel-ai-security` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] - 2024-12-13

### Added

- **Peer Dependencies**: Added explicit peer dependency requirements:
  - `eslint`: `^8.0.0 || ^9.0.0`
  - `ai` (Vercel AI SDK): `^3.0.0 || ^4.0.0 || ^5.0.0`

### Changed

- Updated README compatibility section to reflect supported versions

---

## [0.2.0] - 2024-12-13

### Added

#### 🔒 New Security Rules (+5)

- **`no-system-prompt-leak`** - Prevent system prompts from being exposed in API responses (LLM07)
- **`no-dynamic-system-prompt`** - Prevent dynamic content in system prompts (ASI01)
- **`require-output-filtering`** - Require filtering of sensitive data in tool output (ASI04)
- **`require-audit-logging`** - Suggest audit logging for AI operations (ASI10)
- **`require-rag-content-validation`** - Validate RAG content before use in prompts (ASI07)

#### ⚙️ New Configuration

- **`minimal`** - Gradual adoption config with only 2 critical rules

#### 📚 Documentation

- Individual documentation for all 15 rules in `/docs/rules/`
- Updated README with complete OWASP coverage tables
- Options documentation for each rule

### Changed

- **Plugin version**: 0.1.0 → 0.2.0
- **Total rules**: 10 → 15
- **Total tests**: 122 → 168
- **OWASP LLM coverage**: 5/10 → 6/10
- **OWASP Agentic coverage**: 5/10 → 9/10

---

## [0.1.0] - 2024-12-13

### Added

#### 🔒 Security Rules (10 Total)

##### Critical Priority

- **`require-validated-prompt`** - Detect unsafe prompts (CWE-74, OWASP LLM01)
- **`no-sensitive-in-prompt`** - Prevent secrets/PII in prompts (CWE-200, OWASP LLM02)
- **`no-hardcoded-api-keys`** - Detect hardcoded API keys (CWE-798, OWASP ASI03)
- **`no-unsafe-output-handling`** - Prevent unsafe output handling (CWE-94, OWASP LLM05/ASI05)

##### High Priority

- **`require-tool-schema`** - Ensure tools have Zod inputSchema (CWE-20, OWASP ASI02)
- **`require-max-tokens`** - Require maxTokens limit (CWE-770, OWASP LLM10)
- **`require-max-steps`** - Require maxSteps for multi-step tool calling (CWE-834, OWASP LLM10)
- **`require-tool-confirmation`** - Require confirmation for destructive tools (CWE-862, OWASP ASI09/LLM06)

##### Medium Priority

- **`require-error-handling`** - Require try-catch for AI calls (CWE-755, OWASP ASI08)
- **`require-abort-signal`** - Require AbortSignal for streaming calls (CWE-404)

#### ⚙️ Configurations

- `recommended` - Balanced security (critical rules as errors, high as warnings)
- `strict` - Maximum security (all rules enabled)

#### 📊 Coverage

- **122 tests passing**
- **98.31% line coverage**
- **100% function coverage**

#### 📚 Documentation

- Comprehensive README with AEO optimization
- AGENTS.md for AI coding assistants
- Full OWASP LLM Top 10 and OWASP Agentic Top 10 mapping

#### Supported Functions

- `generateText` - Full coverage
- `streamText` - Full coverage with abort signal
- `generateObject` - Full coverage
- `streamObject` - Full coverage with abort signal
- `tool()` helper - Schema validation
