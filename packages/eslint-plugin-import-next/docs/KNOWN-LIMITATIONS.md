# Known False Negatives and False Positives

This document catalogs known limitations in import-next rules.

## Import Analysis Rules

### `no-circular-imports`

**Known False Negatives (Not Detected)**

- Circular dependencies through side effects
- Circular type-only imports (may be intentional)
- Cycles > 3 levels deep (configurable)

**Known False Positives (Incorrectly Flagged)**

- Type-only circular imports (safe at runtime)
- Lazy-loaded modules that break the cycle

---

### `no-relative-parent-imports`

**Known False Negatives (Not Detected)**

- Parent imports through barrel files
- Aliased parent paths

**Known False Positives (Incorrectly Flagged)**

- Shared utilities in parent directories
- Test imports from source directories

---

### `ordered-imports`

**Known False Negatives (Not Detected)**

- Imports sorted within groups differently
- Type imports interleaved with value imports

**Known False Positives (Incorrectly Flagged)**

- Intentional ordering for side effects
- Framework-specific ordering requirements

---

### `no-unused-imports`

**Known False Negatives (Not Detected)**

- Imports used only in comments/docs
- Imports for side effects only (correctly ignored)

**Known False Positives (Incorrectly Flagged)**

- Imports used in template literals
- Imports used in JSX spread attributes

---

### `no-extraneous-dependencies`

**Known False Negatives (Not Detected)**

- Dependencies used only in generated code
- Dependencies used via dynamic require

**Known False Positives (Incorrectly Flagged)**

- Peer dependencies
- Optional dependencies
- Bundled dependencies

---

### `consistent-type-imports`

**Known False Negatives (Not Detected)**

- Mixed type/value imports in re-exports
- Type imports in namespace imports

**Known False Positives (Incorrectly Flagged)**

- Class imports used both as type and value
- Merged declarations

---

## Boundary Rules

### `no-internal-imports`

**Known False Negatives (Not Detected)**

- Internal imports through wildcard re-exports
- Aliased internal paths

**Known False Positives (Incorrectly Flagged)**

- Testing internal modules (intentional)
- Internal dev tooling

---

### `module-boundary`

**Known False Negatives (Not Detected)**

- Boundary violations through context/providers
- Violations via shared state

**Known False Positives (Incorrectly Flagged)**

- Intentional cross-module access for testing
- Infrastructure code

---

## Performance Rules

### `no-large-bundles`

**Known False Negatives (Not Detected)**

- Size from transitive dependencies
- Runtime-added code

**Known False Positives (Incorrectly Flagged)**

- Tree-shakeable imports
- SSR-only imports

---

## Mitigation Strategies

1. **Path Aliases**: Configure `tsconfig.json` paths
2. **Bundler Analysis**: Use webpack-bundle-analyzer
3. **Monorepo Tools**: Nx/Turborepo for workspace boundaries
