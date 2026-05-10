# ESLint Rule Addition Checklist

> **Purpose:** Ensure all new ESLint rules are properly integrated, documented, and released following project standards.

**⚠️ CRITICAL:** When adding a new ESLint rule to any `@interlace/eslint-plugin-*` package in this monorepo, you MUST complete ALL items in this checklist. Missing any item will cause issues in the release process.

> **Plugin scope decision:** Pick the right target plugin per [`docs/QUALITY_STANDARDS.md`](../../docs/QUALITY_STANDARDS.md) §1 (Conceptual Fit & Plugin Separation) and the table in [`ARCHITECTURE.md`](../../ARCHITECTURE.md#plugin-organization-the-rule-that-decides-where-new-code-goes). Throughout this checklist, `<plugin>` refers to the chosen target package — e.g. `eslint-plugin-secure-coding`, `eslint-plugin-pg`, `eslint-plugin-react-features`.

## 📋 Complete Checklist

### 1. Rule Implementation ✅

- [ ] **Rule file created** in `packages/<plugin>/src/rules/{category}/{rule-name}.ts`
- [ ] **TypeScript types correct:**
  - [ ] `Options` interface defined (NOT `RuleOptions` - that's the tuple type)
  - [ ] `type RuleOptions = [Options?]` (array tuple format - REQUIRED)
  - [ ] `type MessageIds = 'messageId1' | 'messageId2'`
  - [ ] `create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}])` signature
- [ ] **LLM-optimized error messages (2-line format):**
  - [ ] ✅ **Use `formatLLMMessage` utility** from `@interlace/eslint-devkit` (REQUIRED)
  - [ ] Import: `import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit'`
  - [ ] Format follows: `formatLLMMessage({ icon, issueName, cwe?, description, severity, fix, documentationLink })`
  - [ ] ❌ NOT the old 4-line format
  - [ ] Includes actionable fix instructions
  - [ ] Includes documentation link
  - [ ] Uses appropriate severity (CRITICAL, HIGH, MEDIUM, LOW)
  - [ ] Includes CWE reference if security-related
  - [ ] Uses `MessageIcons` constants for consistency
- [ ] **Rule exported** from `packages/<plugin>/src/index.ts`:
  - [ ] Import statement added at top
  - [ ] Added to `rules` object with flat name: `'rule-name': ruleName`
  - [ ] Added to `rules` object with categorized name: `'category/rule-name': ruleName`

### 2. Testing ✅

- [ ] **Unit tests created** in `packages/<plugin>/src/tests/{rule-name}.test.ts`
- [ ] **Test coverage includes:**
  - [ ] Valid cases (should pass)
  - [ ] Invalid cases (should fail)
  - [ ] Auto-fix cases (if rule is fixable)
  - [ ] Edge cases
  - [ ] Configuration options (if rule has options)
- [ ] **100% test coverage policy (REQUIRED):**
  - [ ] Run `npx turbo run test --filter=<plugin> -- --coverage` to verify coverage
  - [ ] Achieve 100% line coverage for the rule implementation
  - [ ] Achieve 100% branch coverage for the rule implementation
  - [ ] All uncovered lines must be documented with `@coverage-note` comments explaining why they cannot be tested
  - [ ] Integration tests added if rule requires file system access or special context
- [ ] **Tests pass:** `npx turbo run test --filter=<plugin>`
- [ ] **Build succeeds:** `npx turbo run build --filter=<plugin>`
- [ ] **No lint errors:** `npx turbo run lint --filter=<plugin>`

### 3. Documentation ✅

- [ ] **AEO-optimized docs page created** at `packages/<plugin>/docs/rules/{rule-name}.md`
  - [ ] Includes keywords for SEO (top of file)
  - [ ] Quick Summary table (Aspect | Details)
  - [ ] Mermaid flowchart showing rule logic (with modern accessible theme)
  - [ ] Configuration options table
  - [ ] Examples section (❌ Incorrect / ✅ Correct)
  - [ ] Usage examples with code blocks
  - [ ] Best practices section
  - [ ] Related rules section
  - [ ] Resources/links section
  - [ ] Version history (if applicable)
- [ ] **README updated** (`packages/<plugin>/README.md`):
  - [ ] Rule added to appropriate category table
  - [ ] Correct icons (💼 ⚠️ 🔧 💡) based on rule configuration
  - [ ] Link to docs page: `[rule-name](./docs/rules/{rule-name}.md)`
  - [ ] Description matches rule purpose
- [ ] **CHANGELOG updated** (`packages/<plugin>/CHANGELOG.md`):
  - [ ] Entry under `## [Unreleased]` → `### Added`
  - [ ] Brief description of rule purpose
  - [ ] Key features/options mentioned
  - [ ] Format: `- **New Rule:`rule-name`** - [description]`

### 4. Configuration ✅

- [ ] **Rule added to recommended config** (if applicable):
  - [ ] Check `packages/<plugin>/src/configs/recommended.ts`
  - [ ] Add rule with appropriate severity
  - [ ] Add any necessary configuration options
- [ ] **Root ESLint config updated** (if rule should be enabled globally):
  - [ ] Check `eslint.config.mjs`
  - [ ] Add rule configuration if needed
  - [ ] Ensure plugin is imported correctly
- [ ] **Plugin exports verified:**
  - [ ] Rule accessible via the target package's public entry (e.g. `eslint-plugin-secure-coding/rules/<rule-name>`)
  - [ ] Both flat name and categorized name work
  - [ ] Test with: `import plugin from '<plugin-package>'` then assert `plugin.rules['<rule-name>']` exists

### 5. Version & Release ✅

- [ ] **Version bump:**
  - [ ] Determine version bump type (patch/minor/major)
  - [ ] Update `packages/<plugin>/package.json` version
  - [ ] Update any dependent packages if needed
  - [ ] Run `npm install` to update lockfile
- [ ] **Git tags alignment:**
  - [ ] Run `npm check-versions` to verify alignment
  - [ ] Run `npm sync-tags:dry-run` to preview tag changes
  - [ ] Run `npm sync-tags` if tags need updating (after version bump)
- [ ] **Release preparation:**
  - [ ] Run `npm run release:dry-run` (`gh workflow run release.yml --ref main -f dry-run=true`) to verify release
  - [ ] Ensure CHANGELOG is complete
  - [ ] Ensure all tests pass
  - [ ] Ensure build succeeds
  - [ ] Ensure no lint errors

### 6. Integration Testing ✅

- [ ] **Playground testing:**
  - [ ] Test rule in the external playground repo (`~/repos/ofriperetz.dev/playground/apps/<plugin>-demo/`) — see [`docs/PLUGIN-REVIEW-WORKFLOW.md`](../../docs/PLUGIN-REVIEW-WORKFLOW.md)
  - [ ] Verify error messages display correctly
  - [ ] Verify auto-fix works (if applicable)
  - [ ] Verify rule configuration options work
- [ ] **Lint verification:**
  - [ ] Run `npx turbo run lint` to ensure no new lint errors
  - [ ] Fix any lint errors introduced
- [ ] **Type checking:**
  - [ ] Run `npx turbo run typecheck`
  - [ ] Fix any type errors

### 7. Final Verification ✅

- [ ] **All checklist items completed**
- [ ] **Code review ready:**
  - [ ] Rule follows project patterns
  - [ ] Error messages are LLM-optimized (2-line format)
  - [ ] Documentation is AEO-optimized
  - [ ] Tests provide good coverage
  - [ ] No console.log or debug code left
- [ ] **Ready for PR:**
  - [ ] All files committed
  - [ ] Commit message follows conventional commits
  - [ ] PR description includes rule summary
  - [ ] PR description mentions breaking changes (if any)

## 🎯 Quick Reference

### File Locations

| Item                | Location                                                                    |
| ------------------- | --------------------------------------------------------------------------- |
| Rule implementation | `packages/<plugin>/src/rules/{category}/{rule-name}.ts`                |
| Rule tests          | `packages/<plugin>/src/rules/{category}/__tests__/{rule-name}.test.ts` |
| Rule exports        | `packages/<plugin>/src/index.ts`                                       |
| Rule documentation  | `packages/<plugin>/docs/rules/{rule-name}.md`                          |
| README              | `packages/<plugin>/README.md`                                          |
| CHANGELOG           | `packages/<plugin>/CHANGELOG.md`                                       |
| Recommended config  | `packages/<plugin>/src/configs/recommended.ts`                         |
| Root ESLint config  | `eslint.config.mjs`                                                         |

### Common Commands

```bash
# Build plugin
npx turbo run build --filter=<plugin>

# Run tests
npx turbo run test --filter=<plugin>

# Lint
npx turbo run lint --filter=<plugin>

# Check versions
npm check-versions

# Sync git tags (dry-run)
npm sync-tags:dry-run

# Sync git tags
npm sync-tags

# Release dry-run
gh workflow run release.yml --ref main -f dry-run=true
```

### Error Message Format (LLM-Optimized)

**✅ REQUIRED:** Use the `formatLLMMessage` utility from `@interlace/eslint-devkit` for consistency.

```typescript
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

messages: {
  ruleName: formatLLMMessage({
    icon: MessageIcons.SECURITY, // or '🔒', '⚠️', etc.
    issueName: 'SQL Injection',
    cwe: 'CWE-89', // Optional, include for security rules
    description: 'SQL Injection detected',
    severity: 'CRITICAL', // or 'HIGH', 'MEDIUM', 'LOW'
    fix: 'Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId])',
    documentationLink: 'https://owasp.org/www-community/attacks/SQL_Injection'
  }),
}
```

**Available Icons:**
- `MessageIcons.SECURITY` (🔒) - Security issues
- `MessageIcons.WARNING` (⚠️) - Warnings
- `MessageIcons.PACKAGE` (📦) - Package/dependency issues
- `MessageIcons.DEVELOPMENT` (🔧) - Development practices
- `MessageIcons.PERFORMANCE` (⚡) - Performance issues
- `MessageIcons.ACCESSIBILITY` (♿) - Accessibility issues
- `MessageIcons.QUALITY` (📚) - Code quality
- `MessageIcons.ARCHITECTURE` (🏗️) - Architecture issues
- `MessageIcons.MIGRATION` (🔄) - Migration/refactoring
- `MessageIcons.DEPRECATION` (❌) - Deprecation
- `MessageIcons.DOMAIN` (📖) - Domain/DDD
- `MessageIcons.COMPLEXITY` (🧠) - Complexity
- `MessageIcons.DUPLICATION` (📋) - Duplication

## ⚠️ Common Mistakes to Avoid

1. **Wrong type definition:** Using `RuleOptions` as interface instead of `Options`
2. **Wrong error message format:** Using 4-line format instead of 2-line format, not using `formatLLMMessage` utility
3. **Missing exports:** Forgetting to add rule to `src/index.ts`
4. **Missing documentation:** Not creating AEO-optimized docs page
5. **Missing CHANGELOG:** Forgetting to update CHANGELOG.md
6. **Missing README update:** Not adding rule to README table
7. **Version misalignment:** Not running `check-versions` and `sync-tags`
8. **No tests:** Creating rule without unit tests
9. **Wrong import path:** Using wrong import in `src/index.ts`
10. **Not using utility:** Manually constructing error messages instead of using `formatLLMMessage`

