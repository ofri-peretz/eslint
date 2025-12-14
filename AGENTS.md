# AGENTS.md - AI Assistant Context

> **Purpose**: Context file for LLMs (Claude, GPT, Gemini, etc.) working on this repository.

## Repository Overview

This is a **monorepo** containing ESLint plugins for security-focused static analysis.

| Directory                                   | Purpose                            |
| ------------------------------------------- | ---------------------------------- |
| `packages/eslint-plugin-secure-coding`      | Framework-agnostic security rules  |
| `packages/eslint-plugin-vercel-ai-security` | Vercel AI SDK security rules       |
| `packages/eslint-plugin-openai-security`    | OpenAI SDK security rules          |
| `packages/eslint-plugin-agentic-security`   | Agentic AI security patterns       |
| `packages/eslint-devkit`                    | Shared utilities for rule creation |

---

## Key Documentation

### For Code Reviews & Releases

- **[docs/QUALITY_STANDARDS.md](./docs/QUALITY_STANDARDS.md)** - Production-ready checklist for ESLint rules
- **[docs/CICD.md](./docs/CICD.md)** - CI/CD workflow documentation with state diagrams

### For Contributing

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - How to contribute, commit guidelines, PR process

### For Coverage Gaps

- **[packages/eslint-plugin-secure-coding/RULETESTER-COVERAGE-LIMITATIONS.md](./packages/eslint-plugin-secure-coding/RULETESTER-COVERAGE-LIMITATIONS.md)** - When `c8 ignore` is acceptable

---

## Quick Commands

```bash
# Run all tests
pnpm nx run-many -t test --all

# Run tests with coverage for a specific plugin
pnpm nx test eslint-plugin-secure-coding --coverage

# Build all packages
pnpm nx run-many -t build --all

# Lint all packages
pnpm nx run-many -t lint --all

# Preview a release (dry-run, safe)
pnpm nx release version --dry-run --projects=eslint-plugin-secure-coding
```

---

## Plugin Scope Rules

When creating or reviewing rules, ensure they're in the correct plugin:

| If the rule...                                                  | It belongs in...                   |
| --------------------------------------------------------------- | ---------------------------------- |
| Applies to any JavaScript/TypeScript code                       | `eslint-plugin-secure-coding`      |
| Checks Vercel AI SDK patterns (`generateText`, `streamText`)    | `eslint-plugin-vercel-ai-security` |
| Checks OpenAI SDK patterns (`openai.chat.completions`)          | `eslint-plugin-openai-security`    |
| Detects agentic patterns (tools, autonomous agents) across SDKs | `eslint-plugin-agentic-security`   |

---

## Quality Checklist for New Rules

Before approving any new ESLint rule:

1. **Conceptual Fit**: Is it in the right plugin?
2. **Coverage**: ≥90% line coverage
3. **Performance**: O(n) complexity, single AST pass
4. **Documentation**: Rule docs with OWASP mapping
5. **Messages**: Clear, actionable error messages

See **[docs/QUALITY_STANDARDS.md](./docs/QUALITY_STANDARDS.md)** for the full checklist.

---

## OWASP Coverage

This repository provides rules mapping to:

- **OWASP Top 10 2021** (Web Security)
- **OWASP Top 10 for LLM Applications 2025** (AI Security)
- **OWASP Agentic Top 10 2026** (Agentic AI Security)
- **OWASP Mobile Top 10 2024** (Mobile Security)

Each plugin's README contains an OWASP coverage matrix.

---

## Branch Protection

- `main` is protected - no direct pushes
- All changes require PR with passing CI and ESLint checks
- Releases are manual via GitHub Actions

---

## Secrets Required

| Secret          | Purpose           |
| --------------- | ----------------- |
| `NPM_TOKEN`     | Publishing to npm |
| `CODECOV_TOKEN` | Coverage uploads  |
