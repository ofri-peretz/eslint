---
name: ESLint Benchmarking
activation: When running or analyzing benchmarks
---

# Benchmark Skill

## Running Benchmarks

```bash
# Navigate to benchmark folder
cd packages/<plugin>/benchmark

# Run secure-coding benchmark
npx eslint --config eslint.config.secure-coding.mjs . --max-warnings 0

# Time benchmark
time npx eslint --config eslint.config.secure-coding.mjs .
```

## Benchmark Structure

```
benchmark/
├── README.md                    # Results documentation
├── eslint.config.<plugin>.mjs   # ESLint config for this plugin
├── vulnerable.js                # Code with intentional issues
└── safe-patterns.js             # Code without issues
```

## Expected Results

For `eslint-plugin-secure-coding`:

- **89 rules** across 8 OWASP categories
- Benchmark should detect issues in `vulnerable.js`
- No false positives on `safe-patterns.js`

For `eslint-plugin-pg`:

- **13 rules** for PostgreSQL security
- Focus on SQL injection, connection security, error handling

## Documenting Results

Update `benchmark/README.md` with:

```markdown
## Benchmark Results

| Metric          | Value |
| --------------- | ----- |
| Total Rules     | X     |
| Issues Detected | Y     |
| Execution Time  | Z ms  |
| False Positives | 0     |
```

## Variance Assumptions

- Run-to-run variance typically <5%
- Results may vary by machine specs
- Always run 3x and take median for accuracy
