# Contributing to Forge.js

Thank you for your interest in contributing to Forge.js! This guide provides structured, predictable contribution guidelines.

## 📋 Table of Contents

- [Bug Reports](#bug-reports)
- [Feature Requests](#feature-requests)
- [Code Contributions](#code-contributions)
- [Documentation](#documentation)
- [Development Setup](#development-setup)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

---

## 🐛 Bug Reports

### How to Report a Bug

1. **Check existing issues** - Search [GitHub Issues](https://github.com/ofri-peretz/forge-js/issues) to see if the bug is already reported
2. **Create a new issue** - Use the [bug report template](https://github.com/ofri-peretz/forge-js/issues/new?template=bug_report.md)
3. **Provide details**:
   - Clear description of the bug
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment details (Node.js version, package versions)
   - Code examples or screenshots if applicable

### Bug Report Template

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:

1. Install package '...'
2. Configure rule '...'
3. Run ESLint on file '...'
4. See error

**Expected behavior**
A clear description of what you expected to happen.

**Environment:**

- Node.js version: [e.g., 20.10.0]
- Package version: [e.g., 1.5.0]
- ESLint version: [e.g., 9.39.0]
- TypeScript version: [e.g., 5.9.3]

**Additional context**
Add any other context about the problem here.
```

---

## ✨ Feature Requests

### How to Request a Feature

1. **Check existing requests** - Search [GitHub Issues](https://github.com/ofri-peretz/forge-js/issues) and [Discussions](https://github.com/ofri-peretz/forge-js/discussions)
2. **Create a feature request** - Use the [feature request template](https://github.com/ofri-peretz/forge-js/issues/new?template=feature_request.md)
3. **Provide context**:
   - Use case and problem it solves
   - Proposed solution or API design
   - Examples of how it would be used
   - Potential impact on existing code

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
A clear description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

---

## 💻 Code Contributions

### Development Setup

1. **Fork and clone** the repository:

   ```bash
   git clone https://github.com/your-username/forge-js.git
   cd forge-js
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Build all packages**:

   ```bash
   pnpm nx run-many -t build --all
   ```

4. **Run tests**:
   ```bash
   pnpm nx run-many -t test --all
   ```

### Code Style

- **TypeScript**: Use TypeScript for all new code
- **ESLint**: Follow the project's ESLint configuration
- **Prettier**: Code is automatically formatted with Prettier
- **Tests**: Write tests for all new features and bug fixes

### Adding a New ESLint Rule

1. **Create rule file** in `packages/eslint-plugin/src/rules/[category]/[rule-name].ts`
2. **Follow the rule template**:

   ```typescript
   import { createRule } from '@forge-js/eslint-plugin-utils';

   export default createRule({
     name: 'rule-name',
     meta: {
       type: 'problem',
       docs: {
         description: 'Rule description',
         recommended: 'warn',
       },
       messages: {
         error: 'Error message with fix suggestion',
       },
       schema: [],
     },
     defaultOptions: [],
     create(context) {
       // Rule implementation
     },
   });
   ```

3. **Add tests** in `packages/eslint-plugin/src/tests/[rule-name].test.ts`
4. **Add documentation** in `packages/eslint-plugin/docs/rules/[rule-name].md`
5. **Export rule** in `packages/eslint-plugin/src/index.ts`

---

## 📚 Documentation

### Documentation Guidelines

- **README files**: Keep package READMEs up-to-date with examples
- **Rule documentation**: Each rule should have a dedicated markdown file
- **API documentation**: Use JSDoc comments for all public APIs
- **Code examples**: Include runnable code examples in documentation

### Documentation Structure

```
packages/[package-name]/
├── README.md              # Package overview and quick start
├── docs/
│   └── rules/            # Individual rule documentation
└── src/
    └── [files].ts        # Source code with JSDoc
```

---

## 🔄 Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types

| Type       | Description             | Example                                   |
| ---------- | ----------------------- | ----------------------------------------- |
| `feat`     | New feature             | `feat(rule): add no-console-log rule`     |
| `fix`      | Bug fix                 | `fix(rule): handle edge case in parser`   |
| `docs`     | Documentation           | `docs(readme): update installation guide` |
| `style`    | Code style (formatting) | `style(utils): format code with prettier` |
| `refactor` | Code refactoring        | `refactor(rule): simplify rule logic`     |
| `test`     | Tests                   | `test(rule): add tests for edge cases`    |
| `chore`    | Maintenance             | `chore(deps): update dependencies`        |
| `perf`     | Performance             | `perf(rule): optimize AST traversal`      |

### Examples

```bash
# Feature
git commit -m "feat(rule): add no-sql-injection rule"

# Bug fix
git commit -m "fix(utils): handle null values in type checker"

# Documentation
git commit -m "docs(readme): add Q&A section for LLM optimization"

# Breaking change
git commit -m "feat(rule)!: change configuration format

BREAKING CHANGE: Configuration now requires 'rules' object instead of flat structure."
```

---

## 🔀 Pull Request Process

### Before Submitting

1. **Update documentation** - Ensure README and docs are updated
2. **Add tests** - Include tests for new features or bug fixes
3. **Run tests** - Ensure all tests pass: `pnpm nx run-many -t test --all`
4. **Run linter** - Fix any linting errors: `pnpm nx run-many -t lint --all`
5. **Update CHANGELOG** - Add entry to CHANGELOG.md (if applicable)

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] Commit messages follow conventional commits
- [ ] No breaking changes (or breaking changes documented)
- [ ] CHANGELOG updated (if applicable)

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

How was this tested?

## Checklist

- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

---

## 🎯 Areas for Contribution

### High Priority

- **New ESLint rules** - Security, performance, accessibility
- **Rule improvements** - Better error messages, auto-fixes
- **Documentation** - Examples, tutorials, API docs
- **Test coverage** - Increase coverage for existing rules

### Always Welcome

- **Bug fixes** - Any bug reports are appreciated
- **Performance improvements** - Optimize rule execution
- **Code quality** - Refactoring and improvements
- **Examples** - Real-world usage examples

---

## 📞 Getting Help

- **Questions**: [GitHub Discussions](https://github.com/ofri-peretz/forge-js/discussions)
- **Issues**: [GitHub Issues](https://github.com/ofri-peretz/forge-js/issues)
- **Documentation**: See [docs/](./docs/) folder

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Forge.js! 🎉
