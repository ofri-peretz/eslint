<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Plugins, configs, resolvers, and tooling for ESLint-driven code quality
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.9+-blue.svg" alt="TypeScript" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-20+-green.svg" alt="Node.js" /></a>
  <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/pnpm-9.15-cc00ff.svg" alt="pnpm" /></a>
  <a href="https://nx.dev/"><img src="https://img.shields.io/badge/Nx-22.0-143055.svg" alt="Nx" /></a>
  <a href="https://vitest.dev/"><img src="https://img.shields.io/badge/Vitest-4.0-6E9F18.svg" alt="Vitest" /></a>
  <a href="https://codecov.io/gh/ofri-peretz/eslint"><img src="https://codecov.io/gh/ofri-peretz/eslint/branch/main/graph/badge.svg" alt="Codecov" /></a>
</p>

<p align="center">
This monorepo houses battle-tested ESLint plugins, sharable configs, and supporting utilities that help teams enforce architecture, security, and consistency with actionable, LLM-friendly feedback.
</p>

---

## Philosophy

**Interlace** fosters **strength through integration**. We **interlace** security directly into your workflow, creating a resilient fabric of code. Tools should **guide rather than gatekeep**, providing educational feedback that strengthens developers.

**Why an independent ecosystem?** 🚀 Ship fast without upstream bureaucracy • 🤖 AI-optimized messages (CWE, OWASP, fixes) • ⚡ Unified codebase for performance • 🏗️ Consistent patterns across all plugins • 📚 Educational "why" explanations • 🔧 Modern ESLint 9 flat config

All rules are **clean-room implementations** — familiar naming, better engineering.

---

## 📦 Available Packages

Independently versioned ESLint-focused packages: plugins, configs, and supporting utilities.

### Security Plugins

| Package                                                                           | Description                  | Downloads                                                                                |
| --------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------- |
| [`eslint-plugin-secure-coding`](./packages/eslint-plugin-secure-coding)           | Comprehensive security rules | ![npm](https://img.shields.io/npm/dm/eslint-plugin-secure-coding?style=flat-square)      |
| [`eslint-plugin-crypto`](./packages/eslint-plugin-crypto)                         | Cryptographic security       | ![npm](https://img.shields.io/npm/dm/eslint-plugin-crypto?style=flat-square)             |
| [`eslint-plugin-jwt`](./packages/eslint-plugin-jwt)                               | JWT security best practices  | ![npm](https://img.shields.io/npm/dm/eslint-plugin-jwt?style=flat-square)                |
| [`eslint-plugin-pg`](./packages/eslint-plugin-pg)                                 | PostgreSQL security          | ![npm](https://img.shields.io/npm/dm/eslint-plugin-pg?style=flat-square)                 |
| [`eslint-plugin-browser-security`](./packages/eslint-plugin-browser-security)     | Browser/frontend security    | ![npm](https://img.shields.io/npm/dm/eslint-plugin-browser-security?style=flat-square)   |
| [`eslint-plugin-express-security`](./packages/eslint-plugin-express-security)     | Express.js security          | ![npm](https://img.shields.io/npm/dm/eslint-plugin-express-security?style=flat-square)   |
| [`eslint-plugin-nestjs-security`](./packages/eslint-plugin-nestjs-security)       | NestJS security              | ![npm](https://img.shields.io/npm/dm/eslint-plugin-nestjs-security?style=flat-square)    |
| [`eslint-plugin-lambda-security`](./packages/eslint-plugin-lambda-security)       | AWS Lambda security          | ![npm](https://img.shields.io/npm/dm/eslint-plugin-lambda-security?style=flat-square)    |
| [`eslint-plugin-vercel-ai-security`](./packages/eslint-plugin-vercel-ai-security) | Vercel AI SDK security       | ![npm](https://img.shields.io/npm/dm/eslint-plugin-vercel-ai-security?style=flat-square) |

### Code Quality & Architecture Plugins

| Package                                                                     | Description                              | Downloads                                                                             |
| --------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| [`eslint-plugin-modularity`](./packages/eslint-plugin-modularity)           | Structural integrity and DDD patterns    | ![npm](https://img.shields.io/npm/dm/eslint-plugin-modularity?style=flat-square)      |
| [`eslint-plugin-modernization`](./packages/eslint-plugin-modernization)     | ESNext migration and syntax evolution    | ![npm](https://img.shields.io/npm/dm/eslint-plugin-modernization?style=flat-square)   |
| [`eslint-plugin-maintainability`](./packages/eslint-plugin-maintainability) | Cognitive load and clean code            | ![npm](https://img.shields.io/npm/dm/eslint-plugin-maintainability?style=flat-square) |
| [`eslint-plugin-reliability`](./packages/eslint-plugin-reliability)         | Runtime stability and error safety       | ![npm](https://img.shields.io/npm/dm/eslint-plugin-reliability?style=flat-square)     |
| [`eslint-plugin-operability`](./packages/eslint-plugin-operability)         | Production readiness and resource health | ![npm](https://img.shields.io/npm/dm/eslint-plugin-operability?style=flat-square)     |
| [`eslint-plugin-conventions`](./packages/eslint-plugin-conventions)         | Team-specific habits and styles          | ![npm](https://img.shields.io/npm/dm/eslint-plugin-conventions?style=flat-square)     |
| [`eslint-plugin-import-next`](./packages/eslint-plugin-import-next)         | High-fidelity dependency graph analysis  | ![npm](https://img.shields.io/npm/dm/eslint-plugin-import-next?style=flat-square)     |
| [`eslint-plugin-react-features`](./packages/eslint-plugin-react-features)   | React best practices and optimization    | ![npm](https://img.shields.io/npm/dm/eslint-plugin-react-features?style=flat-square)  |
| [`eslint-plugin-react-a11y`](./packages/eslint-plugin-react-a11y)           | React accessibility and WCAG compliance  | ![npm](https://img.shields.io/npm/dm/eslint-plugin-react-a11y?style=flat-square)      |

### Supporting Tools

| Package                                                | Description                               | Downloads                                                                        |
| ------------------------------------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------- |
| [`@interlace/eslint-devkit`](./packages/eslint-devkit) | Build your own team-specific ESLint rules | ![npm](https://img.shields.io/npm/dm/@interlace/eslint-devkit?style=flat-square) |

---

## 🎯 Why This Repo?

ESLint is the backbone for keeping large codebases healthy. These packages target the real problems teams face at scale: inconsistent patterns, architectural drift, security gaps, and slow onboarding. The plugins deliver guardrails plus explanations tuned for humans and LLMs alike.

### Problems We Solve

| Challenge                      | How these plugins help                                                          |
| ------------------------------ | ------------------------------------------------------------------------------- |
| 🏗️ **Architectural Drift**     | Enforce module boundaries and prevent circular dependencies automatically       |
| 🔒 **Security Blind Spots**    | Catch hardcoded secrets, injection vulnerabilities, and unsafe patterns early   |
| 📚 **Inconsistent Patterns**   | Codify team conventions into automated rules that teach while they enforce      |
| 🤖 **AI-Assisted Development** | LLM-optimized error messages that AI assistants can actually understand and fix |
| 🚀 **Developer Onboarding**    | New team members learn the codebase through guardrails, not just documentation  |

### Design Principles

- **Battle-Tested**: Every tool solves a real problem encountered in production
- **Actionable Feedback**: Error messages explain the "why" and show how to fix
- **LLM-Ready**: Optimized for modern AI-assisted development workflows
- **Zero Configuration Burden**: Sensible defaults with escape hatches when needed

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
- **Want to contribute code?** See our [Contributing Guide](./CONTRIBUTING.md)

---

## 🔗 Get Started

| Resource                                                                   | Description                       |
| -------------------------------------------------------------------------- | --------------------------------- |
| 📦 [npm packages](https://www.npmjs.com/search?q=eslint-plugin)            | Install and start using the tools |
| 💬 [GitHub Discussions](https://github.com/ofri-peretz/eslint/discussions) | Ask questions and share ideas     |
| 🐛 [Report Issues](https://github.com/ofri-peretz/eslint/issues)           | Found a bug? Let us know          |

---

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz) — See [LICENSE](LICENSE) for details.

---

Made with ❤️ from lessons learned in the trenches
