# 🗺️ Project Roadmap & Documentation

This document serves as the central source of truth for the **eslint-plugin-secure-coding** project, consolidating roadmaps, security policies, and optimization guides.

---

## 🔒 Unified Security Roadmap

### OWASP LLM Top 10 2025 & Agentic Security

**Status:** 🏗️ Partially Implemented (Phase 2 Complete)

We are implementing a comprehensive suite of rules addressing the OWASP Top 10 for Large Language Models (2025) and Agentic AI systems.

#### Key Categories & Current Status

- **LLM01: Prompt Injection**: Implemented.
- **LLM02: Insecure Output Handling**: Implemented (e.g., `no-unsafe-output`).
- **LLM03: Training Data Poisoning**: 🚧 Planned.
- **LLM07: System Prompt Leakage**: Implemented.
- **Agentic Rules**: Foundation set for agent permissions and tool usage is in progress (`eslint-plugin-agentic-security`).

### Framework-Agnostic Mobile Security

**Status:** ✅ Implementation Complete (State-of-the-Art)

We have implemented 40 framework-agnostic security rules covering critical mobile security risks, aligned with OWASP MASVS.

- **M1: Improper Credential Usage**: `no-hardcoded-credentials`, `no-credentials-in-query-params`.
- **M2: Inadequate Supply Chain Security**: `detect-suspicious-dependencies`.
- **M3: Insecure Authentication/Authorization**: `no-missing-authentication`.
- **M5: Insecure Communication**: `no-http-urls`, `no-insecure-redirects`.
- **M9: Insecure Data Storage**: `no-unencrypted-local-storage`.

### Advanced Accessibility (A11y)

**Status:** 📅 Planned

Future expansion to go beyond basic WCAG compliance, focusing on cognitive accessibility and AI-assisted interfaces.

- **Focus**: Dynamic content updates, meaningful AI responses, and accessible data visualizations.

---

## 🛡️ Security Policy

### Supported Versions

We release patches for security vulnerabilities based on CVSS v3.0 Rating.

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

### Reporting a Vulnerability

**Do not report security vulnerabilities on public GitHub issues.**
Please report them via email to: [ofriperetzdev@gmail.com](mailto:ofriperetzdev@gmail.com)

**Include in your report:**

1.  Type of issue (e.g., buffer overflow, SQLi).
2.  Full paths of affected source files.
3.  Step-by-step reproduction instructions.
4.  Proof-of-concept (if possible).

We aim to acknowledge reports within 48 hours and provide an initial assessment within 5 business days.

### Security Best Practices

1.  **Keep dependencies updated** regularly.
2.  **Use lock files** (`pnpm-lock.yaml`) to ensure consistency.
3.  **Review rule configurations** for your specific security posture.

---

## ⚡ ESLint Optimization & Performance

### Advanced Optimization Techniques

Real-world, benchmarked techniques to keep linting fast in a monorepo.

1.  **Enable Caching (Biggest Impact)**

    ```bash
    eslint . --cache --cache-location .eslintcache
    ```

    _Impact: 50-80% faster on subsequent runs._

2.  **Scope Your Linting**
    Don't lint everything every time. Use `nx affected` or similar tools.

    ```bash
    nx affected -t lint
    ```

3.  **Optimize Rule Configuration**
    - Disable unused rules.
    - Use `warn` instead of `error` for stylistic issues during dev to avoid breaking flow (enforce on CI).
    - **Avoid Type-Aware Rules on large files** if not strictly necessary, as they require full parser services.

### Troubleshooting Performance

- **TIMING=1**: Run with `TIMING=1 eslint .` to see which rules take the most time.
- **Debug Mode**: Use `DEBUG=eslint:*` to trace internal execution.

---

## 📦 SDK Security Plugins

We are modularizing security rules into SDK-specific plugins to provide tailored protection:

- `@vercel-ai/security`
- `@langchain/security`
- `@anthropic/security`

These plugins focus on usage patterns specific to their respective SDKs (e.g., preventing insecure default configs in Vercel AI SDK).
