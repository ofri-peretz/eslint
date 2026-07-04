# Contributing to eslint Repository

Thank you for your interest in contributing to eslint repository! This guide provides structured, predictable contribution guidelines.

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

1. **Check existing issues** - Search [GitHub Issues](https://github.com/ofri-peretz/eslint/issues) to see if the bug is already reported
2. **Create a new issue** - Use the [bug report template](https://github.com/ofri-peretz/eslint/issues/new?template=bug_report.md)
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
- ESLint version: [e.g., 9.39.0 — supported majors are 8.x, 9.x, 10.x; see docs/ESLINT_VERSION_SUPPORT.md]
- TypeScript version: [e.g., 5.9.3]

**Additional context**
Add any other context about the problem here.
```

---

## ✨ Feature Requests

### How to Request a Feature

1. **Check existing requests** - Search [GitHub Issues](https://github.com/ofri-peretz/eslint/issues) and [Discussions](https://github.com/ofri-peretz/eslint/discussions)
2. **Create a feature request** - Use the [feature request template](https://github.com/ofri-peretz/eslint/issues/new?template=feature_request.md)
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
   git clone https://github.com/your-username/eslint.git
   cd eslint
   ```

2. **Install dependencies** (npm — the repo is on npm, not pnpm):

   ```bash
   npm install
   ```

3. **Build all packages**:

   ```bash
   npm run build
   ```

4. **Run tests**:

   ```bash
   npm test
   ```

5. **Add a changeset** if your change is user-visible (see "Versioning & Releases" below):

   ```bash
   npm run changeset
   ```

### ESLint Version Support

We support **ESLint v8, v9, and v10** — every package in `packages/*` declares `"eslint": "^8.0.0 || ^9.0.0 || ^10.0.0"` as a peer dependency. New code, new rules, and new packages must keep this range valid.

The policy and current ecosystem-share data are in [docs/ESLINT_VERSION_SUPPORT.md](./docs/ESLINT_VERSION_SUPPORT.md). Refresh the data anytime with `npm run stats:eslint-versions`.

### Code Style

- **TypeScript**: Use TypeScript for all new code
- **ESLint**: Follow the project's ESLint configuration
- **Prettier**: Code is automatically formatted with Prettier
- **Tests**: Write tests for all new features and bug fixes

### Adding a New ESLint Rule

1. **Create rule file** in `packages/eslint-plugin/src/rules/[category]/[rule-name].ts`
2. **Follow the rule template**:

   ```typescript
   import { createRule } from '@interlace/eslint-devkit';

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
6. **Review [Quality Standards](./docs/QUALITY_STANDARDS.md)** before submitting

### Quality Standards for ESLint Rules

All ESLint rules must meet these criteria before release:

| Criterion          | Requirement                                |
| ------------------ | ------------------------------------------ |
| **Conceptual Fit** | Rule belongs in the correct plugin         |
| **Test Coverage**  | 100% target, ratchet-enforced (QUALITY_STANDARDS.md §2) |
| **Performance**    | O(n) complexity, single-pass AST traversal |
| **Documentation**  | Rule docs with examples, OWASP mapping     |

See **[docs/QUALITY_STANDARDS.md](./docs/QUALITY_STANDARDS.md)** for the complete checklist.

---

## 📦 Versioning & Releases (Changesets)

This repo uses [Changesets](https://github.com/changesets/changesets) for
versioning + CHANGELOG generation. **Every PR with a user-visible change to a
published package needs a changeset.**

### Adding a changeset

```bash
npm run changeset
```

The CLI prompts:

1. Which packages changed?
2. `major` (breaking) / `minor` (feature) / `patch` (fix)?
3. A short summary (lands in the CHANGELOG).

It writes a markdown file like `.changeset/spicy-llamas-dance.md`. Commit
that file with the PR.

### When to skip a changeset

- Internal-only changes (refactor of build scripts, test-only PRs, doc tweaks).
- Repo-tooling PRs that don't touch any published package's source.

### What happens after merge

1. CI's `changesets-pr.yml` workflow opens (or refreshes) a **"Version
   Packages"** PR. It accumulates every changeset since the last release,
   bumps each affected `package.json`, regenerates `CHANGELOG.md`, and
   deletes the consumed changeset files.
2. **Merging that PR** triggers `release.yml`, which:
   - Detects the version diff vs npm and fans out a matrix job per package.
   - For each package: runs `npm publish --provenance`, creates the
     `<short-name>@<version>` git tag, and creates a **GitHub Release**
     with notes auto-extracted from the package's `CHANGELOG.md`.

There is no `npx nx release` anymore — the Nx setup was retired in favour of
Turborepo + Changesets.

### Day-to-day commands

```bash
npm run changeset                  # add a changeset
npm run changeset:status           # what's queued for the next release?
npm run release:status             # combined view: pending + last 3 tags / package
npm run release:notes <pkg> <ver>  # preview the GH Release body for a version
```

### Docs deploys (`apps/docs`) — manual only

The Next.js docs site under `apps/docs` is **not** auto-deployed. Vercel's
git integration is disabled in `vercel.json`. The only path to ship docs is
the manual workflow:

```bash
gh workflow run deploy-docs.yml -f environment=preview
gh workflow run deploy-docs.yml -f environment=production
```

Or trigger from the Actions tab. Each environment is gated by GitHub
Environments — add required reviewers to `docs-production` in
Settings → Environments if you want an approval step before prod.

### Recovery flows

#### "A publish failed mid-flight"

Re-running the workflow is safe — every step is idempotent:

```bash
npm run release            # re-runs release.yml (workflow_dispatch)
npm run release:dry-run    # preview only, no side effects
```

The detect step skips packages whose version is already on npm; the publish
step skips `npm view <pkg>@<ver>` matches; the tag step is a no-op if the
tag already exists; the GitHub Release step `--edit`s an existing release
instead of failing.

#### "Tags and npm have drifted out of sync"

The `release:reconcile` family compares git tags vs npm versions vs GitHub
Releases for every package and flags / fixes drift:

```bash
npm run release:reconcile               # report only (exits 1 on drift)
npm run release:reconcile:backfill      # create missing tags + push them
npm run release:reconcile:releases      # fill in missing GitHub Releases
npm run release:reconcile:cleanup       # DELETE orphan tags (destructive)
```

Or, hands-off: the **`release-hygiene.yml`** workflow runs the same
reconciler weekly, opens a tracking issue when drift appears, and closes
the issue automatically when drift clears. You can trigger it manually
via `gh workflow run release-hygiene.yml -f action=full`.

#### "A package was published manually outside this workflow"

The next `release-hygiene.yml` run will see the npm version with no
matching git tag and surface it in the tracking issue. Run with
`action=backfill-missing` to create the tags retroactively (the script
walks `git log` on `<pkg>/package.json` to find the commit where the
version was first set).

#### "An old tag has no GitHub Release"

Common for tags pushed before this workflow added GH Release creation.
Fix once with `action=create-releases` (or `action=full`); the script
generates notes from each package's `CHANGELOG.md` (or a generic stub
when no entry exists).

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
3. **Run tests** - Ensure all tests pass: `npm test`
4. **Run linter** - Fix any linting errors: `npm run lint`
5. **Update CHANGELOG** - Add entry to CHANGELOG.md (if applicable)

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] Commit messages follow conventional commits
- [ ] No breaking changes (or breaking changes documented)
- [ ] CHANGELOG updated (if applicable)
- [ ] **[Quality Standards](./docs/QUALITY_STANDARDS.md)** reviewed (for ESLint rules)

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

- **Questions**: [GitHub Discussions](https://github.com/ofri-peretz/eslint/discussions)
- **Issues**: [GitHub Issues](https://github.com/ofri-peretz/eslint/issues)
- **Documentation**: See [docs/](./docs/) folder

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to this repository! 🎉
