---
type: orchestrator
name: QA Stress Test Pipeline
description: Stress test ESLint plugins for FPs, FNs, and performance bottlenecks
agents:
  - security
  - eslint
  - performance
---

# QA Stress Test Pipeline Orchestrator

**Comprehensive quality assurance** for ESLint plugins, focusing on three critical dimensions:

1. **False Positives (FP)** — Legitimate patterns incorrectly flagged
2. **False Negatives (FN)** — Vulnerable patterns not detected
3. **Performance** — Rule execution time and memory usage

## Usage

```
/pipeline qa-stress: Run full QA for eslint-plugin-pg
/pipeline qa-stress: FP audit for eslint-plugin-jwt
/pipeline qa-stress: Performance benchmark eslint-plugin-secure-coding
/pipeline qa-stress: FN discovery for eslint-plugin-crypto
```

---

## Plugin Registry (16 Plugins)

| Plugin                             | Rules | Domain            | Priority |
| ---------------------------------- | ----- | ----------------- | -------- |
| `eslint-plugin-secure-coding`      | 75    | Core Security     | P0       |
| `eslint-plugin-pg`                 | 13    | PostgreSQL        | P0       |
| `eslint-plugin-jwt`                | 12    | Token Security    | P0       |
| `eslint-plugin-crypto`             | 18    | Cryptography      | P0       |
| `eslint-plugin-browser-security`   | 21    | Browser/DOM       | P1       |
| `eslint-plugin-vercel-ai-security` | 15    | AI/LLM Safety     | P1       |
| `eslint-plugin-mongodb-security`   | 11    | MongoDB/NoSQL     | P1       |
| `eslint-plugin-express-security`   | 12    | Express.js        | P1       |
| `eslint-plugin-nestjs-security`    | 8     | NestJS Framework  | P2       |
| `eslint-plugin-lambda-security`    | 10    | AWS Lambda        | P2       |
| `eslint-plugin-import-next`        | 56    | Import/Arch       | P2       |
| `eslint-plugin-architecture`       | ~15   | Code Architecture | P3       |
| `eslint-plugin-quality`            | ~20   | Code Quality      | P3       |
| `eslint-plugin-react-a11y`         | ~25   | React A11y        | P3       |
| `eslint-plugin-react-features`     | ~40   | React Features    | P3       |

---

## 🔴 Phase 1: False Positive (FP) Audit

**Goal**: Identify legitimate patterns incorrectly flagged as violations.

### Step 1.1: Collect Real-World Patterns

// turbo

```bash
# Find all existing valid test cases for the plugin
find packages/<plugin>/src/rules -name "*.spec.ts" -exec grep -A5 "valid:" {} \;
```

### Step 1.2: Generate FP Stress Fixtures

Create edge-case files to stress test FP detection:

```
packages/<plugin>/test/fp-stress/
├── conditional-guards.ts      # Values protected by runtime checks
├── type-narrowing.ts          # TypeScript type guards
├── framework-idioms.ts        # Framework-specific safe patterns
├── wrapper-functions.ts       # Utility wrappers that sanitize
├── imports-from-trusted.ts    # Known-safe library imports
└── configuration-options.ts   # Rule options that should whitelist
```

### Step 1.3: Execute FP Stress Test

// turbo

```bash
# Run lint on FP stress fixtures (expect 0 errors)
pnpm eslint packages/<plugin>/test/fp-stress --config packages/<plugin>/eslint.config.mjs --max-warnings 0
```

### Step 1.4: Document FP Findings

For each false positive found:

| Pattern                 | Rule              | Fix Strategy             |
| ----------------------- | ----------------- | ------------------------ |
| `sanitize(input)`       | `no-unsafe-query` | Add sanitizer detection  |
| `typeof x === 'string'` | `no-xyz`          | Add type guard awareness |

### Step 1.5: Create FP Regression Tests

Add discovered FPs to the `valid` section of rule tests to prevent regression.

---

## 🟡 Phase 2: False Negative (FN) Discovery

**Goal**: Identify vulnerable patterns that rules fail to detect.

### Step 2.1: Review FN Documentation

// turbo

```bash
# Check existing FN docs
cat packages/<plugin>/docs/rules/*.md | grep -A20 "Known False Negative"
```

### Step 2.2: Generate FN Stress Fixtures

```
packages/<plugin>/test/fn-stress/
├── dynamic-lookups.ts         # queries[userInput] - dynamic property access
├── aliased-calls.ts           # const q = pool.query; q(unsafeInput)
├── destructured-refs.ts       # const { query } = pool; query(x)
├── cross-file-flow.ts         # import { getQuery } from './builder'
├── async-chains.ts            # fetch().then(x => process(x))
├── eval-patterns.ts           # eval(), new Function()
├── prototype-pollution.ts     # Object.assign, spread operators
└── obfuscated-calls.ts        # encoded strings, obfuscation
```

### Step 2.3: Execute FN Discovery Test

// turbo

```bash
# Run lint on FN stress fixtures (document what ISN'T caught)
pnpm eslint packages/<plugin>/test/fn-stress --config packages/<plugin>/eslint.config.mjs --format json > /tmp/fn-results.json
```

### Step 2.4: Analyze Detection Gaps

Review the JSON output:

- Files with 0 errors = **undetected vulnerable patterns**
- Triage by severity (CRITICAL gaps vs. edge cases)

### Step 2.5: Update FN Documentation

For each genuine FN (not fixable without cross-file analysis):

```markdown
## Known False Negatives

### Dynamic Property Lookup

**Why**: Rule cannot resolve dynamic keys at lint time.

\`\`\`typescript
// ❌ NOT DETECTED
const queries = { unsafe: `SELECT * FROM users WHERE id = ${id}` };
db.query(queries[action]); // 'action' unknown
\`\`\`

**Mitigation**: Use parameterized queries with explicit names.
```

---

## 🟢 Phase 3: Performance Stress Test

**Goal**: Ensure rules execute within acceptable time budgets.

### Step 3.1: Baseline Performance Measurement

// turbo

```bash
# Run tests with timing
TIMING=1 pnpm nx test <plugin> --coverage
```

### Step 3.2: Large File Stress Test

Create synthetic large files:

```bash
# Generate 10K line file with mixed patterns
node -e "
const patterns = [
  'db.query(input);',
  'const safe = sanitize(input); db.query(safe);',
  'await pool.query(sql, params);',
];
for (let i = 0; i < 10000; i++) {
  console.log(patterns[i % patterns.length]);
}
" > packages/<plugin>/test/perf-stress/large-file.ts
```

### Step 3.3: Execute Performance Benchmark

// turbo-all

```bash
# Time lint execution on stress file
time pnpm eslint packages/<plugin>/test/perf-stress/large-file.ts --config packages/<plugin>/eslint.config.mjs
```

### Step 3.4: Rule-by-Rule Performance

// turbo

```bash
# Run existing benchmark if available
pnpm tsx packages/<plugin>/benchmark/benchmark.mjs
```

### Step 3.5: Performance Targets

| File Size      | Target Time | Threshold   |
| -------------- | ----------- | ----------- |
| < 500 lines    | < 100ms     | Acceptable  |
| 500-2000 lines | < 500ms     | Monitor     |
| > 2000 lines   | < 2000ms    | Investigate |

### Step 3.6: Memory Profiling (Optional)

```bash
# Profile memory usage
node --expose-gc --heapsnapshot-signal=SIGUSR2 \
  node_modules/.bin/eslint packages/<plugin>/test/perf-stress/large-file.ts
```

---

## 📊 Phase 4: QA Report Generation

After running all phases, generate a comprehensive report:

### Report Template

```markdown
# QA Stress Test Report: <plugin>

**Date**: YYYY-MM-DD
**Version**: X.Y.Z
**Total Rules**: N

## Executive Summary

| Dimension   | Status   | Score | Notes                |
| ----------- | -------- | ----- | -------------------- |
| FP Rate     | ✅/⚠️/❌ | X/100 | N issues found       |
| FN Coverage | ✅/⚠️/❌ | X/100 | N gaps documented    |
| Performance | ✅/⚠️/❌ | Xms   | Under/over threshold |

## False Positive Analysis

### Issues Found: N

| Rule        | Pattern   | Severity | Status   |
| ----------- | --------- | -------- | -------- |
| `rule-name` | `pattern` | HIGH     | Open/Fix |

## False Negative Analysis

### Detection Gaps: N

| Rule        | Gap Description | Limitation      | Documented |
| ----------- | --------------- | --------------- | ---------- |
| `rule-name` | Dynamic lookup  | Static analysis | ✅         |

## Performance Metrics

| Rule              | Avg Time (ms) | File Size | Status     |
| ----------------- | ------------- | --------- | ---------- |
| `no-unsafe-query` | 15            | 500 LOC   | ✅ Fast    |
| `no-sql-concat`   | 120           | 500 LOC   | ⚠️ Monitor |

## Recommendations

1. [ ] Fix FP: Add detection for X pattern
2. [ ] Document FN: Y limitation
3. [ ] Optimize: Z rule performance
```

---

## Quick Commands

```bash
# Full QA for a specific plugin
/pipeline qa-stress: Run full QA for eslint-plugin-pg

# FP-focused audit
/pipeline qa-stress: FP audit for eslint-plugin-jwt

# FN discovery only
/pipeline qa-stress: FN discovery for eslint-plugin-crypto

# Performance only
/pipeline qa-stress: Performance benchmark eslint-plugin-secure-coding

# Quick health check (all dimensions, less depth)
/pipeline qa-stress: Quick health check for eslint-plugin-browser-security
```

---

## Directory Structure

After QA runs, the plugin should have:

```
packages/<plugin>/
├── test/
│   ├── fp-stress/           # FP stress test fixtures
│   │   └── *.ts
│   ├── fn-stress/           # FN stress test fixtures
│   │   └── *.ts
│   └── perf-stress/         # Performance stress files
│       └── large-file.ts
├── docs/
│   └── qa/
│       └── QA_REPORT.md     # Latest QA report
└── benchmark/
    └── benchmark.mjs        # Performance benchmark script
```

---

## Related Workflows

- `/eslint-rule-standards` — Rule implementation standards
- `/fn-documentation` — FN documentation format
- `/pipeline release:` — Release after QA passes

## Scoring Criteria

### FP Score (0-100)

- **100**: Zero false positives in stress fixtures
- **80-99**: Minor FPs on edge cases only
- **60-79**: Some FPs on common patterns
- **<60**: Critical FPs affecting adoption

### FN Score (0-100)

- **100**: All known FNs documented with mitigations
- **80-99**: Most FNs documented
- **60-79**: Critical FNs undocumented
- **<60**: Significant detection gaps

### Performance Score

- **✅ Fast**: < 100ms per 500 LOC
- **⚠️ Monitor**: 100-500ms per 500 LOC
- **❌ Slow**: > 500ms per 500 LOC

---

## Automation Integration

For CI/CD integration, add to `.github/workflows/qa.yml`:

```yaml
qa-stress-test:
  runs-on: ubuntu-latest
  strategy:
    matrix:
      plugin:
        - eslint-plugin-pg
        - eslint-plugin-jwt
        - eslint-plugin-crypto
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - run: pnpm install
    - run: pnpm nx test ${{ matrix.plugin }}
    - run: pnpm eslint packages/${{ matrix.plugin }}/test/fp-stress --max-warnings 0
    - run: time pnpm eslint packages/${{ matrix.plugin }}/test/perf-stress/large-file.ts
```
