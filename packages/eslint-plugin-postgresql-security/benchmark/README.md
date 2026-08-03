# eslint-plugin-postgresql-security Benchmark

A benchmark demonstrating `eslint-plugin-postgresql-security` capabilities for PostgreSQL security and best practices.

## Quick Start

```bash
cd benchmark
npm install
npm run benchmark
```

---

## 📊 Benchmark Results Summary

| Criteria                      | eslint-plugin-postgresql-security     |
| ----------------------------- | -------------------- |
| **Rules Available**           | 13                   |
| **Security Rules**            | 6                    |
| **Resource Management Rules** | 3                    |
| **Quality/Performance Rules** | 4                    |
| **CWE References**            | ✅ All rules         |
| **LLM-Optimized Messages**    | ⭐⭐⭐⭐⭐           |
| **False Positives**           | 0 (on safe-patterns) |

---

## 🔍 Detection Capabilities

| Category            | Detected Patterns                                |
| ------------------- | ------------------------------------------------ |
| SQL Injection       | Template literals, concatenation, format strings |
| SSL/TLS Issues      | Disabled certificate validation                  |
| Credential Exposure | Hardcoded passwords and connection strings       |
| Connection Leaks    | Missing client.release(), double release         |
| Transaction Bugs    | BEGIN/COMMIT on pool (race conditions)           |
| Performance Issues  | N+1 queries, SELECT \*                           |
| Schema Hijacking    | Dynamic search_path                              |
| File Access         | COPY FROM with file paths                        |

---

## 🔍 LLM/AI Message Format

### eslint-plugin-postgresql-security message example:

```
🔒 CWE-89 OWASP:A03-Injection CVSS:9.8 | Unsafe query detected | CRITICAL
   Fix: Use parameterized query: client.query('SELECT * FROM users WHERE id = $1', [userId])
```

| LLM Feature           | eslint-plugin-postgresql-security |
| --------------------- | ---------------- |
| CWE ID                | ✅               |
| OWASP mapping         | ✅               |
| Severity score        | ✅               |
| Exact fix instruction | ✅               |
| Documentation link    | ✅               |

---

## 📁 File Structure

```
benchmark/
├── README.md                    # This file
├── package.json                 # Dependencies
├── benchmark.mjs                # Performance benchmark
├── eslint.config.pg.mjs         # Plugin configuration
└── test-files/
    ├── vulnerable.js            # pg code with vulnerabilities
    └── safe-patterns.js         # Safe patterns (false positive test)
```

---

## 🔄 Re-running the Benchmark

```bash
# Install dependencies
npm install

# Run benchmark
npm run benchmark

# Run ESLint directly
npx eslint --config eslint.config.pg.mjs test-files/vulnerable.js
```

---

_Last updated: December 2024_
