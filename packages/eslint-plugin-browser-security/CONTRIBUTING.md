# Contributing to eslint-plugin-browser-security

Thank you for your interest in contributing to `eslint-plugin-browser-security`!

## Quick Start

```bash
# Clone the monorepo
git clone https://github.com/ofri-peretz/eslint.git
cd eslint

# Install dependencies
pnpm install

# Build this package
nx build eslint-plugin-browser-security

# Run tests
nx test eslint-plugin-browser-security

# Run tests with coverage
nx test eslint-plugin-browser-security --coverage
```

## Package-Specific Guidelines

### Rule Categories

This plugin focuses on **browser-specific** security vulnerabilities:

1. **XSS Prevention** - innerHTML, eval, dynamic code execution
2. **postMessage Security** - Origin validation, wildcard origins
3. **Storage Security** - localStorage, sessionStorage, IndexedDB
4. **Cookie Security** - JS-accessible cookies, missing attributes
5. **WebSocket Security** - wss://, message handlers
6. **File API & Workers** - FileReader, Blob URLs, Service Workers
7. **CSP Security** - unsafe-inline, unsafe-eval

### Rule Structure

Each rule follows this directory structure:

```
src/rules/[rule-name]/
├── index.ts      # Rule implementation
└── [rule-name].test.ts  # Tests
```

### Quality Requirements

- **Coverage**: ≥90% line coverage
- **Documentation**: Rule doc in `docs/rules/[rule-name].md`
- **OWASP Mapping**: CWE and OWASP category in error messages
- **LLM-Optimized**: Use `formatLLMMessage()` from eslint-devkit

## Full Contributing Guide

For complete contribution guidelines, commit message format, and PR process, see the [main CONTRIBUTING.md](../../CONTRIBUTING.md) in the repository root.

## Related Documentation

- [Quality Standards](../../docs/QUALITY_STANDARDS.md)
- [Plugin Review Workflow](../../docs/PLUGIN-REVIEW-WORKFLOW.md)
