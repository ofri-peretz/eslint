---

## Pre-Review: Ensure Complete Rule Coverage

> [!IMPORTANT]
> Before starting the review, verify that **every rule** in the plugin has corresponding examples in the playground demo app. We should have examples for ALL rules.

### Check for Missing Examples

```bash
# Option 1: Parse the built rules object (most reliable)
cd ~/repos/ofriperetz.dev/eslint
nx build eslint-plugin-X
node -e "console.log(Object.keys(require('./dist/packages/eslint-plugin-X').rules).length)"

# Option 2: Count rule files in source
ls packages/eslint-plugin-X/src/rules/*.ts | grep -v index | wc -l

# Option 3: List all example folders in playground
ls ~/repos/ofriperetz.dev/playground/apps/X-security-demo/src/examples/ | wc -l
```

### If Rules Are Missing Examples

For each missing rule, create:

```
src/examples/XX-rule-name/
├── invalid.ts   # Code that should trigger the rule
└── valid.ts     # Code that should pass the rule
```

**Example structure:**

```typescript
// invalid.ts - Should trigger errors
import { generateText } from 'ai';

// BAD: This pattern violates the rule
async function badExample() {
  // ... violating code
}

// valid.ts - Should pass
import { generateText } from 'ai';

// GOOD: This pattern follows the rule
async function goodExample() {
  // ... compliant code
}
```

---

## Pre-Review: CI/CD Verification

> [!IMPORTANT]
> Before manual review, verify all CI checks pass.

```bash
cd ~/repos/ofriperetz.dev/eslint

# Run all quality gates for the plugin
nx run eslint-plugin-X:build
nx run eslint-plugin-X:test --coverage
nx run eslint-plugin-X:lint

# Verify coverage meets threshold (90%+ lines)
nx run eslint-plugin-X:test --coverage 2>&1 | grep -E 'Lines|Branches|Functions'
```

See [CICD.md](./CICD.md) for pipeline details and [QUALITY_STANDARDS.md](./QUALITY_STANDARDS.md) for thresholds.

---

## Pre-Review: Version Verification

Ensure the playground uses the expected plugin version:

```bash
# Check version in eslint repo
cat ~/repos/ofriperetz.dev/eslint/packages/eslint-plugin-X/package.json | jq .version

# Check version installed in playground
cat ~/repos/ofriperetz.dev/playground/apps/X-demo/node_modules/eslint-plugin-X/package.json | jq .version

# If using file: link, they should match. If using npm, check latest published:
npm view eslint-plugin-X version
```

---

## Setup Instructions

### Step 1: Build the Plugin (in eslint repo)

```bash
cd ~/repos/ofriperetz.dev/eslint

# Build the plugin (replace with target plugin)
nx build eslint-plugin-X

# Build all plugins at once
nx run-many -t build --projects='eslint-plugin-*'
```

### Step 2: Link/Install in Playground Demo App

```bash
cd ~/repos/ofriperetz.dev/playground/apps/<demo-app-name>

# Option A: Use file link to local build (development)
# In package.json devDependencies:
# "eslint-plugin-vercel-ai-security": "file:../../../eslint/dist/packages/eslint-plugin-vercel-ai-security"

# Option B: Use npm version (production review)
# "eslint-plugin-vercel-ai-security": "^1.0.0"

# Option C: Use RC version (pre-release review)
# "eslint-plugin-vercel-ai-security": "^1.0.0-rc.1"

# Install dependencies
pnpm install
```

### Step 3: Run ESLint

```bash
# Run lint on full demo app
pnpm lint

# Or run on specific files
pnpm eslint src/examples/*/invalid.ts  # Should show errors
pnpm eslint src/examples/*/valid.ts    # Should pass (no errors)
```

---

## Review Checklist

### 1. Rules Work as Expected ✅

**Check:**

- [ ] Invalid files trigger expected errors
- [ ] Valid files pass with no errors (only `@typescript-eslint` warnings allowed)
- [ ] Error counts match expected (documented in each example)
- [ ] Suggestions/fixes are available where applicable

**Command:**

```bash
# Count errors on invalid files
pnpm eslint src/examples/*/invalid.ts 2>&1 | grep -c "error"

# Verify valid files pass
pnpm eslint src/examples/*/valid.ts 2>&1 | grep "0 problems" || echo "Has warnings"
```

### 2. Human-Readable Messages 👤

**Evaluate:**

- [ ] Clear problem description (what's wrong)
- [ ] Actionable fix suggestion (how to fix)
- [ ] Severity indicator (CRITICAL/HIGH/MEDIUM/LOW)
- [ ] Documentation link provided
- [ ] No jargon or cryptic codes

**Ideal Format:**

```
⚠️ CWE-XXX OWASP:AXX-Category CVSS:X.X | Clear description | SEVERITY [Compliance]
  Fix: Actionable instruction | https://link-to-docs
```

### 3. LLM/AI Agent Message Clarity 🤖

**Evaluate:**

- [ ] Structured format (parseable by AI)
- [ ] CWE/OWASP/CVSS identifiers included
- [ ] Context-rich description
- [ ] Specific fix instructions (not vague)
- [ ] Code examples in fix suggestions

**AI-Optimized Elements:**
| Element | Purpose |
|---------|---------|
| CWE-XXX | Vulnerability classification |
| OWASP:AXX | Web security category |
| CVSS:X.X | Severity score (0-10) |
| [SOC2,GDPR] | Compliance frameworks |
| Fix: ... | Concrete remediation |

### 4. Computational Complexity ⚡

**Evaluate:**

- [ ] Lint completes in < 5 seconds for demo app
- [ ] No memory spikes (should use < 500MB)
- [ ] No infinite loops or hangs
- [ ] Works on large files (> 1000 lines)

**Benchmark Commands:**

```bash
# Basic timing
time pnpm lint 2>&1 | tail -5

# Memory profiling (macOS)
NODE_OPTIONS="--max-old-space-size=512" /usr/bin/time -l pnpm lint 2>&1 | grep 'maximum resident set size'

# Generate large test file for stress testing
echo "// $(seq 1 1000 | xargs -I{} echo 'const x{} = {};')" > /tmp/large.ts
time pnpm eslint /tmp/large.ts 2>&1

# Chrome DevTools profiling
node --inspect-brk ./node_modules/.bin/eslint src/
# Open chrome://inspect and use Performance/Memory tabs
```

**Acceptable Ranges:**
| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Time | < 2s | 2-5s | > 5s |
| Memory | < 200MB | 200-500MB | > 500MB |

### 5. State-of-the-Art Assessment 🌟

**Score each (1-5):**
| Aspect | Score | Notes |
|--------|-------|-------|
| OWASP Alignment | /5 | Covers relevant Top 10 |
| Industry Standards | /5 | Follows ESLint best practices |
| Detection Accuracy | /5 | Low false positive rate |
| Fix Quality | /5 | Suggestions are correct |
| Documentation | /5 | Rules are documented |

**Total: /25**

### 6. Setup Ease 🛠️

**Evaluate:**
| Task | Easy (1-2 min) | Medium (3-5 min) | Hard (> 5 min) |
|------|----------------|------------------|----------------|
| Install package | ✓ | | |
| Configure ESLint | | | |
| Run first lint | | | |
| Understand errors | | | |
| Apply fixes | | | |

---

## Review Output Template

```markdown
# Plugin Review: [plugin-name]

**Date:** YYYY-MM-DD
**Version:** X.X.X
**Demo App:** [demo-app-name]

## Summary

| Category      | Score | Notes |
| ------------- | ----- | ----- |
| Rules Work    | ✅/❌ |       |
| Human Clarity | X/5   |       |
| LLM Clarity   | X/5   |       |
| Performance   | X/5   |       |
| State-of-Art  | X/25  |       |
| Setup Ease    | X/5   |       |

## Detailed Findings

### 1. Rules Correctness

...

### 2. Message Quality (Human)

...

### 3. Message Quality (LLM)

...

### 4. Performance

...

### 5. Modern Standards

...

### 6. Developer Experience

...

## Recommendations

...
```

---

## Troubleshooting

### Plugin Not Found

```bash
# Rebuild and reinstall
cd ~/repos/ofriperetz.dev/eslint
nx build <plugin-name> --skip-nx-cache
cd ~/repos/ofriperetz.dev/playground/apps/<demo-app>
pnpm install
```

### Config Errors

```bash
# Check ESLint config is valid
pnpm eslint --print-config src/index.ts
```

### Version Mismatch

```bash
# Check installed versions
pnpm list eslint-plugin-X
npm view eslint-plugin-X versions
```

### Performance Issues

```bash
# Profile rule execution
DEBUG=eslint:* pnpm lint 2>&1 | head -100

# Identify slow rules
pnpm eslint src/ --format json | jq '.[] | {filePath, messages: .messages | length}'
```

---

## Related Documentation

- [Quality Standards](./QUALITY_STANDARDS.md) - Detailed quality checklist and thresholds
- [Coverage Limitations](./RULETESTER-COVERAGE-LIMITATIONS.md) - c8 ignore patterns and rationale
- [CI/CD Pipeline](./CICD.md) - Automated quality gates and workflows
- [Contributing Guide](./CONTRIBUTING.md) - Release process and versioning
