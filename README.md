# 🔧 Forge.js

> **LLM-Optimized ESLint Plugin Ecosystem**

A modern TypeScript monorepo providing powerful ESLint rules and utilities designed for better code quality and LLM-enhanced development workflows.

[![CI](https://github.com/ofri-peretz/forge-js/actions/workflows/ci.yml/badge.svg)](https://github.com/ofri-peretz/forge-js/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg)](https://pnpm.io/)
[![Nx](https://img.shields.io/badge/built%20with-Nx-143055.svg)](https://nx.dev/)

---

## 📦 Packages

This monorepo contains independently versioned packages:

| Package                                                           | Version                                                                    | Description                                      |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------ |
| [`@forge-js/eslint-plugin`](./packages/eslint-plugin)             | ![npm](https://img.shields.io/npm/v/@forge-js/eslint-plugin-llm-optimized) | Core ESLint plugin with LLM-optimized rules      |
| [`@forge-js/eslint-plugin-utils`](./packages/eslint-plugin-utils) | ![npm](https://img.shields.io/npm/v/@forge-js/eslint-plugin-utils)         | Utilities for building TypeScript ESLint plugins |

---

## 🎯 What is Forge.js?

**Forge.js** is a comprehensive ESLint plugin ecosystem built with TypeScript and optimized for modern development workflows. It provides:

- **🤖 LLM-Optimized Rules**: ESLint rules designed to work seamlessly with AI coding assistants
- **🏗️ Solid Infrastructure**: Built on proven patterns from `typescript-eslint`
- **🔧 Developer-Friendly**: Easy to configure, extend, and customize
- **📊 Type-Safe**: Full TypeScript support with type checking utilities
- **⚡ Performance**: Optimized for speed without sacrificing accuracy
- **🧪 Well-Tested**: Comprehensive test coverage with Vitest

### Key Features

- **Architecture & Dependency Management**: Enforce module boundaries and prevent circular dependencies
- **Code Quality**: Detect console logs, enforce naming conventions, and more
- **Security**: Identify hardcoded secrets and dangerous patterns
- **Performance**: Optimize bundle size and runtime performance
- **Accessibility**: Ensure web content is accessible to all users

---

## 🚀 Quick Start

### Installation

```bash
# Install the ESLint plugin
pnpm add -D @forge-js/eslint-plugin-llm-optimized

# Or with npm
npm install --save-dev @forge-js/eslint-plugin-llm-optimized

# Or with yarn
yarn add -D @forge-js/eslint-plugin-llm-optimized
```

### Configuration

Add to your `eslint.config.js`:

```javascript
import forgePlugin from '@forge-js/eslint-plugin-llm-optimized';

export default [
  {
    plugins: {
      '@forge-js': forgePlugin,
    },
    rules: {
      '@forge-js/no-console-log': 'error',
      '@forge-js/no-circular-dependencies': 'warn',
      '@forge-js/no-internal-modules': 'error',
    },
  },
];
```

---

## 📚 Documentation

- **[Contributing Guide](./docs/CONTRIBUTING.md)** - How to contribute, release process, and development workflow
- **[ESLint Plugin Documentation](./packages/eslint-plugin/README.md)** - Available rules and configuration
- **[Utils API Documentation](./packages/eslint-plugin-utils/README.md)** - API documentation for plugin utilities

---

## 🛠️ Development

### Prerequisites

- **Node.js**: 20+
- **pnpm**: 10.18.3+
- **Nx**: Managed via pnpm

### Setup

```bash
# Clone the repository
git clone https://github.com/ofri-peretz/forge-js.git
cd forge-js

# Install dependencies
pnpm install

# Build all packages
pnpm nx run-many -t build --all

# Run tests
pnpm nx run-many -t test --all

# Lint code
pnpm nx run-many -t lint --all
```

### Monorepo Structure

```
forge-js/
├── packages/
│   ├── eslint-plugin/        # Core ESLint plugin
│   ├── eslint-plugin-utils/  # Shared utilities
│   └── cli/                  # CLI tools (internal)
├── docs/                     # Documentation
├── .github/                  # GitHub Actions workflows
└── README.md                 # This file
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/CONTRIBUTING.md) for details on:

- Code of conduct
- Development workflow
- Commit conventions
- Pull request process
- Release process

### Quick Contribution Checklist

1. **Fork & Clone**: Fork the repository and clone it locally
2. **Branch**: Create a feature branch (`feat/your-feature` or `fix/your-fix`)
3. **Develop**: Make your changes with tests
4. **Commit**: Use conventional commits (`feat:`, `fix:`, `docs:`, etc.)
5. **Test**: Ensure all tests pass (`pnpm nx run-many -t test --all`)
6. **PR**: Submit a pull request with a clear description

---

## 📋 Available Rules

### Architecture Rules

| Rule                       | Description               | Auto-fixable |
| -------------------------- | ------------------------- | ------------ |
| `no-circular-dependencies` | Prevent circular imports  | ❌           |
| `no-internal-modules`      | Enforce module boundaries | ❌           |

### Development Rules

| Rule             | Description                     | Auto-fixable |
| ---------------- | ------------------------------- | ------------ |
| `no-console-log` | Disallow console.log statements | ✅           |

### Security Rules

| Rule                   | Description                  | Auto-fixable |
| ---------------------- | ---------------------------- | ------------ |
| `no-hardcoded-secrets` | Detect hardcoded credentials | ❌           |

See the [ESLint Plugin README](./packages/eslint-plugin/README.md) for complete rule documentation.

---

## 🧪 Testing

```bash
# Run all tests
pnpm nx run-many -t test --all

# Run tests for specific package
pnpm nx run eslint-plugin:test

# Watch mode
pnpm nx run eslint-plugin:test --watch

# Coverage
pnpm nx run eslint-plugin:test --coverage
```

---

## 📊 Project Stats

- **Language**: TypeScript 5.9+
- **Build System**: Nx 22.0+
- **Test Framework**: Vitest 4.0+
- **Package Manager**: pnpm 10.18+
- **Linting**: ESLint 9.8+
- **Test Coverage**: 90%+

---

## 🔗 Links

- **GitHub**: [github.com/ofri-peretz/forge-js](https://github.com/ofri-peretz/forge-js)
- **npm**: [@forge-js](https://www.npmjs.com/search?q=%40forge-js)
- **Issues**: [GitHub Issues](https://github.com/ofri-peretz/forge-js/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ofri-peretz/forge-js/discussions)

---

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

See [LICENSE](LICENSE) for full details.

---

## 🙏 Acknowledgments

- Inspired by [typescript-eslint](https://typescript-eslint.io/)
- Built with [Nx](https://nx.dev/)
- Tested with [Vitest](https://vitest.dev/)

---

## 💡 Support

- **📖 Documentation**: Check the [docs](./docs) folder
- **🐛 Bug Reports**: [Open an issue](https://github.com/ofri-peretz/forge-js/issues/new?template=bug_report.md)
- **💬 Questions**: [Start a discussion](https://github.com/ofri-peretz/forge-js/discussions)
- **✨ Feature Requests**: [Open an issue](https://github.com/ofri-peretz/forge-js/issues/new?template=feature_request.md)

---

Made with ❤️ by [Ofri Peretz](https://github.com/ofri-peretz)
