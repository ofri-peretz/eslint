# AGENTS.md

> AI Assistant Instructions for this ESLint plugin

## Overview

This plugin provides ESLint rules for code quality and architecture patterns.

## Quick Start

```bash
cd packages/eslint-plugin-${plugin}
npm install
npm build
npm test
```

## Project Structure

```
src/
├── index.ts          # Plugin entry point
├── rules/            # Rule implementations
└── configs/          # Preset configurations
```

## Code Style Guidelines

- Use `AST_NODE_TYPES` from `@typescript-eslint/utils`
- Follow Zero-FP (False Positive) design principles
- All rules must have structured LLM-optimized messages

## Testing Instructions

```bash
npm test                    # Run all tests
npm test:coverage           # With coverage
npm test -- --watch         # Watch mode
```

## Security Considerations

- OWASP mapping for security-related rules
- CWE identifiers where applicable
