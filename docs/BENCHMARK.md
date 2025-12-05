
## 🤖 Automated Regression Testing

Performance is automatically tracked on every Pull Request to prevent regressions.

### Benchmark Scripts

The project includes automated benchmark scripts that can be run locally or in CI:

1.  **Micro-benchmarks** (`scripts/benchmark-plugin.ts`): Measures performance of internal utilities (LRU cache, message formatting, security checks).
2.  **Macro-benchmarks** (`scripts/benchmark-macro.ts`): Generates a synthetic 100-file TypeScript codebase and measures full linting time.

### Running Locally

```bash
# Run micro-benchmarks
pnpm tsx scripts/benchmark-plugin.ts

# Run macro-benchmarks (full linting simulation)
pnpm tsx scripts/benchmark-macro.ts
```

### CI Integration

The `Performance Benchmarks` workflow runs on every PR to ensure:
*   Utility functions remain optimized
*   Linting time does not degrade significantly
