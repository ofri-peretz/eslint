# ESLint Plugin Review Workflow

This document provides a standardized workflow for reviewing ESLint security plugins using the playground demo apps.

## Playground Location

```
~/repos/ofriperetz.dev/playground/apps/
```

## Available Demo Apps

| Demo App                  | Plugin                             | Description                  |
| ------------------------- | ---------------------------------- | ---------------------------- |
| `vercel-ai-security-demo` | `eslint-plugin-vercel-ai-security` | Vercel AI SDK security rules |
| `demo-secure-coding-app`  | `eslint-plugin-secure-coding`      | General secure coding rules  |

---

## Quick Review Command

To trigger a comprehensive plugin review, use this prompt:

```
Please run eslint rules @[demo-app-name] and provide me a comprehensive review about:

1. If rules worked as expected
2. Clarity of rule messages for humans
3. Clarity of rule messages for LLMs/AI Agents
4. Complexity/Computational complexity
5. How state-of-the-art is
6. How easy was it for you to set the plugin
```

---

## Pre-Review: Ensure Complete Rule Coverage

> [!IMPORTANT]
> Before starting the review, verify that **every rule** in the plugin has corresponding examples in the playground demo app. We should have examples for ALL rules.

### Check for Missing Examples

```bash
# List all rules in the plugin
cd ~/repos/ofriperetz.dev/eslint
cat packages/eslint-plugin-vercel-ai-security/src/index.ts | grep -E "^\s+'[a-z-]+'" | wc -l

# List all example folders in playground
ls ~/repos/ofriperetz.dev/playground/apps/vercel-ai-security-demo/src/examples/ | wc -l
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

## Setup Instructions

### Step 1: Build the Plugin (in eslint repo)

```bash
cd ~/repos/ofriperetz.dev/eslint

# Build the plugin (replace with target plugin)
nx build eslint-plugin-vercel-ai-security

# Or for secure-coding:
nx build eslint-plugin-secure-coding
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

**Benchmark Command:**

```bash
time pnpm lint 2>&1 | tail -5
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
pnpm list eslint-plugin-vercel-ai-security
npm view eslint-plugin-vercel-ai-security versions
```
