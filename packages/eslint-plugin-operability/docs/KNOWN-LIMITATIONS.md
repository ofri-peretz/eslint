# Known False Negatives and False Positives

This document catalogs known limitations in operability rules.

## Logging Rules

### `require-structured-logging`

**Known False Negatives (Not Detected)**

- Logging through custom wrappers
- Logging via third-party libraries not configured
- Dynamic log method selection

**Known False Positives (Incorrectly Flagged)**

- Development-only console.log (should be allowed in dev)
- CLI application output (not logs)

---

### `no-sensitive-data-logging`

**Known False Negatives (Not Detected)**

- Sensitive data obfuscated but recoverable
- Sensitive data in nested objects
- Dynamically constructed log messages

**Known False Positives (Incorrectly Flagged)**

- Sanitized/masked sensitive data (safe)
- Non-sensitive fields with sensitive-sounding names

---

## Resource Management Rules

### `require-resource-cleanup`

**Known False Negatives (Not Detected)**

- Resources acquired via factory functions
- Resources shared across modules
- Cleanup in separate cleanup functions

**Known False Positives (Incorrectly Flagged)**

- Resources managed by framework (React, etc.)
- Resources with automatic cleanup (GC'd)

---

### `no-unbounded-resource-acquisition`

**Known False Negatives (Not Detected)**

- Limits set in configuration files
- Limits enforced at infrastructure level

**Known False Positives (Incorrectly Flagged)**

- Bounded by external systems
- Intentional bulk operations

---

## Observability Rules

### `require-correlation-ids`

**Known False Negatives (Not Detected)**

- Correlation IDs set in middleware
- Framework-level correlation handling

**Known False Positives (Incorrectly Flagged)**

- Synchronous-only code paths
- Unit tests and scripts

---

### `require-metrics`

**Known False Negatives (Not Detected)**

- Metrics handled by APM tools automatically
- Metrics in wrapper/decorator patterns

**Known False Positives (Incorrectly Flagged)**

- Internal utility functions
- Rarely-called code paths

---

## Mitigation Strategies

1. **APM Integration**: Use automatic instrumentation
2. **Middleware**: Handle cross-cutting concerns centrally
3. **Configuration**: Use environment-based rule adjustments
