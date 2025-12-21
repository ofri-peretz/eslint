# 🧭 ESLint Monorepo

> **Plugins, configs, resolvers, and tooling for ESLint-driven code quality**

This monorepo is purpose-built for ESLint. It houses battle-tested plugins, sharable configs, resolvers, and supporting utilities that help teams enforce architecture, security, and consistency with actionable, LLM-friendly feedback.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg)](https://pnpm.io/)
[![Nx](https://img.shields.io/badge/built%20with-Nx-143055.svg)](https://nx.dev/)

---

## 🛡️ Show your security

Add this badge to your README to show you are protected:

[![Security: eslint-plugin-secure-coding](https://img.shields.io/badge/Security-eslint--plugin--secure--coding-blue?style=flat-square)](https://github.com/ofri-peretz/eslint)

```markdown
[![Security: eslint-plugin-secure-coding](https://img.shields.io/badge/Security-eslint--plugin--secure--coding-blue?style=flat-square)](https://github.com/ofri-peretz/eslint)
```

---

## 📦 Available Packages

Independently versioned ESLint-focused packages: plugins, configs, resolvers, and supporting utilities.

> **Note**: Version badges are dynamically updated from npm. For the latest version information, visit [npmjs.com](https://www.npmjs.com/search?q=eslint-plugin-llm)

### ESLint Plugins — LLM-Optimized Rules

The core offering: ESLint plugins with rules that enforce team conventions and provide AI-friendly error messages. Available under multiple package names for discoverability:

| Package Name                                                            | Version                                                                                                                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@forge-js/eslint-plugin-llm-optimized`](./packages/eslint-plugin)     | [![npm](https://img.shields.io/npm/v/@forge-js/eslint-plugin-llm-optimized)](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized) |
| [`eslint-plugin-llm-optimized`](./packages/eslint-plugin-llm-optimized) | [![npm](https://img.shields.io/npm/v/eslint-plugin-llm-optimized)](https://www.npmjs.com/package/eslint-plugin-llm-optimized)                     |
| [`eslint-plugin-llm`](./packages/eslint-plugin-llm)                     | [![npm](https://img.shields.io/npm/v/eslint-plugin-llm)](https://www.npmjs.com/package/eslint-plugin-llm)                                         |
| [`eslint-plugin-mcp`](./packages/eslint-plugin-mcp)                     | [![npm](https://img.shields.io/npm/v/eslint-plugin-mcp)](https://www.npmjs.com/package/eslint-plugin-mcp)                                         |
| [`eslint-plugin-mcp-optimized`](./packages/eslint-plugin-mcp-optimized) | [![npm](https://img.shields.io/npm/v/eslint-plugin-mcp-optimized)](https://www.npmjs.com/package/eslint-plugin-mcp-optimized)                     |

> **Which one should I use?** They're all the same plugin. Pick whichever name resonates with your team or is easiest to find via search.

### Supporting Tools

| Package                                                      | Version                                                                                                                 | What It Does                              |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| [`@forge-js/cli`](./packages/cli)                            | [![npm](https://img.shields.io/npm/v/@forge-js/cli)](https://www.npmjs.com/package/@forge-js/cli)                       | CLI utilities for common team workflows   |
| [`@interlace/eslint-devkit`](./packages/eslint-plugin-utils) | [![npm](https://img.shields.io/npm/v/@interlace/eslint-devkit)](https://www.npmjs.com/package/@interlace/eslint-devkit) | Build your own team-specific ESLint rules |

---

## 🎯 Why This ESLint Repo?

ESLint is the backbone for keeping large codebases healthy. These packages target the real problems teams face at scale: inconsistent patterns, architectural drift, security gaps, and slow onboarding. The plugins deliver guardrails plus explanations tuned for humans and LLMs alike.

### Problems We Solve

| Challenge                      | How the ESLint stack helps                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| 🏗️ **Architectural Drift**     | Enforce module boundaries and prevent circular dependencies automatically                |
| 🔒 **Security Blind Spots**    | Catch hardcoded secrets, injection vulnerabilities, and unsafe patterns before PR review |
| 📚 **Inconsistent Patterns**   | Codify team conventions into automated rules that teach while they enforce               |
| 🤖 **AI-Assisted Development** | LLM-optimized error messages that AI assistants can actually understand and fix          |
| 🚀 **Developer Onboarding**    | New team members learn the codebase through guardrails, not just documentation           |

### Design Principles

- **Team-First**: Built for organizations, not just individual developers
- **Battle-Tested**: Every tool solves a real problem encountered in production
- **Actionable Feedback**: Error messages explain the "why" and show how to fix
- **LLM-Ready**: Optimized for modern AI-assisted development workflows
- **Zero Configuration Burden**: Sensible defaults with escape hatches when needed

### Current Focus Areas

- **Code Quality Automation**: ESLint plugins that enforce team standards and catch issues early
- **Architecture Enforcement**: Prevent the technical debt that accumulates in large codebases
- **Security Guardrails**: Automated detection of common vulnerabilities and anti-patterns
- **Developer Experience**: CLI tools that make doing the right thing the easy thing
- **Team Scalability**: Tools that help maintain quality as your team grows

---

## 👥 Who Is This For?

| Role                     | How these packages help                                                     |
| ------------------------ | --------------------------------------------------------------------------- |
| **Tech Leads**           | Enforce architectural decisions automatically instead of during code review |
| **Platform Teams**       | Provide guardrails that scale across multiple teams and repositories        |
| **Security Engineers**   | Catch vulnerabilities at development time, not in production                |
| **Engineering Managers** | Reduce onboarding time and maintain consistency as teams grow               |
| **Senior Engineers**     | Codify institutional knowledge into automated tooling                       |

---

## 🤝 Contributing

We welcome contributions! If you've faced a problem in your organization that could benefit others, we'd love to hear about it.

- **Have an idea?** [Start a discussion](https://github.com/ofri-peretz/eslint/discussions)
- **Found a bug?** [Open an issue](https://github.com/ofri-peretz/eslint/issues)
- **Want to contribute code?** See our [Contributing Guide](./docs/CONTRIBUTING.md)

---

## 🔗 Get Started

| Resource                                                                   | Description                          |
| -------------------------------------------------------------------------- | ------------------------------------ |
| 📦 [npm packages](https://www.npmjs.com/search?q=eslint-plugin-llm)        | Install and start using the tools    |
| 📖 [ESLint Plugin Docs](./packages/eslint-plugin/README.md)                | Full rule documentation and examples |
| 💬 [GitHub Discussions](https://github.com/ofri-peretz/eslint/discussions) | Ask questions and share ideas        |
| 🐛 [Report Issues](https://github.com/ofri-peretz/eslint/issues)           | Found a bug? Let us know             |

---

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz) — See [LICENSE](LICENSE) for details.

---

Made with ❤️ from lessons learned in the trenches
