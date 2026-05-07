# Import Plugin Benchmark

Comparing `eslint-plugin-import` vs `eslint-plugin-import-next`

## Latest Results

| Files  | eslint-plugin-import | eslint-plugin-import-next | Speedup |
| ------ | -------------------- | ------------------------- | ------- |
| 1,000  | TBD                  | TBD                       | TBD     |
| 5,000  | TBD                  | TBD                       | TBD     |
| 10,000 | TBD                  | TBD                       | TBD     |

## Run This Benchmark

```bash
# Generate fixtures first
npm run generate:import

# Run benchmark
npm run benchmark:import
```

## Fixture Types

- Named imports/exports
- Default imports/exports
- Re-exports
- Barrel files
- Circular dependencies (intentional edge cases)

## Configs

- `configs/import.config.js` - eslint-plugin-import
- `configs/import-next.config.js` - eslint-plugin-import-next
