---
description: Standards for creating rule documentation with consistent format for security vs quality/governance rules
---

# Rule Documentation Standards

This workflow defines the standard format for ESLint rule documentation files (.md and .mdx).

## Frontmatter Fields by Category

### Security Rules

```yaml
---
title: rule-name
description: 'Brief security description'
category: security
severity: critical | high | medium | low
tags: ['security', 'cwe-XXX', 'owasp-category']
autofix: false
# Security-specific fields
cwe: CWE-XXX # Common Weakness Enumeration ID
cve: CVE-YYYY-XXXXX # If applicable
owasp: A01:2021-Category-Name # OWASP Top 10 category
owaspMobile: M1-Improper-Platform-Usage # OWASP Mobile Top 10 (if applicable)
---
```

### Quality/Governance Rules

```yaml
---
title: rule-name
description: 'Brief quality description'
category: quality | conventions | accessibility | reliability | operability | modernization
severity: medium | low
tags: ['quality', 'maintainability', 'readability']
autofix: true | suggestions | false
# Quality-specific fields
principle: SRP | OCP | LSP | ISP | DIP | DRY | KISS | YAGNI | LoD
pattern: Singleton | Factory | Observer | Strategy | Decorator | etc
cleanCode: naming | functions | comments | formatting | error-handling | boundaries
cognitiveComplexity: true # If rule affects cognitive complexity
affects: readability | maintainability | testability | performance | scalability
effort: low | medium | high # Effort to fix violations
---
```

## Field Reference

### Universal Fields (All Rules)

| Field         | Type     | Required | Description                 |
| ------------- | -------- | -------- | --------------------------- |
| `title`       | string   | ✅       | Rule name (kebab-case)      |
| `description` | string   | ✅       | Brief one-line description  |
| `category`    | string   | ✅       | Rule category               |
| `severity`    | string   | ✅       | critical, high, medium, low |
| `tags`        | string[] | ✅       | Searchable keywords         |
| `autofix`     | string   | ✅       | true, suggestions, false    |

### Security-Specific Fields

| Field         | Type   | Required | Description                  |
| ------------- | ------ | -------- | ---------------------------- |
| `cwe`         | string | ✅       | CWE ID (e.g., CWE-79)        |
| `cve`         | string | ❌       | CVE ID if applicable         |
| `owasp`       | string | ❌       | OWASP Top 10 2021 category   |
| `owaspMobile` | string | ❌       | OWASP Mobile Top 10 category |

### Quality/Governance-Specific Fields

| Field                 | Type     | Required | Description                             |
| --------------------- | -------- | -------- | --------------------------------------- |
| `principle`           | string   | ❌       | Software principle enforced (see below) |
| `pattern`             | string   | ❌       | Design pattern related (GoF patterns)   |
| `cleanCode`           | string   | ❌       | Clean Code chapter/category             |
| `cognitiveComplexity` | boolean  | ❌       | Affects cognitive complexity metrics    |
| `affects`             | string[] | ❌       | What aspects of code this improves      |
| `effort`              | string   | ❌       | Effort to fix: low, medium, high        |

## Software Principles Reference

### SOLID Principles

- `SRP` - Single Responsibility Principle: A class should have only one reason to change
- `OCP` - Open/Closed Principle: Open for extension, closed for modification
- `LSP` - Liskov Substitution Principle: Subtypes must be substitutable for base types
- `ISP` - Interface Segregation Principle: Many specific interfaces over one general-purpose
- `DIP` - Dependency Inversion Principle: Depend on abstractions, not concretions

### Other Key Principles

- `DRY` - Don't Repeat Yourself: Every piece of knowledge should have a single representation
- `KISS` - Keep It Simple, Stupid: Favor simplicity over complexity
- `YAGNI` - You Aren't Gonna Need It: Don't implement until actually needed
- `LoD` - Law of Demeter: Only talk to immediate friends
- `SoC` - Separation of Concerns: Separate program into distinct sections
- `CoC` - Convention over Configuration: Sensible defaults over explicit settings
- `PoLA` - Principle of Least Astonishment: Behavior should match expectations

## Design Patterns Reference

### Creational Patterns

- `Singleton`, `Factory`, `AbstractFactory`, `Builder`, `Prototype`

### Structural Patterns

- `Adapter`, `Bridge`, `Composite`, `Decorator`, `Facade`, `Flyweight`, `Proxy`

### Behavioral Patterns

- `ChainOfResponsibility`, `Command`, `Iterator`, `Mediator`, `Memento`
- `Observer`, `State`, `Strategy`, `TemplateMethod`, `Visitor`

## Clean Code Categories Reference

Based on Robert C. Martin's "Clean Code":

- `naming` - Meaningful names chapter
- `functions` - Functions chapter (small, single purpose)
- `comments` - Comments chapter (code should be self-documenting)
- `formatting` - Formatting chapter
- `objects-vs-data` - Objects and Data Structures chapter
- `error-handling` - Error Handling chapter
- `boundaries` - Boundaries chapter
- `unit-tests` - Unit Tests chapter
- `classes` - Classes chapter
- `systems` - Systems chapter
- `emergence` - Emergence chapter
- `concurrency` - Concurrency chapter

## Example: Quality Rule with Full Metadata

```yaml
---
title: consistent-function-scoping
description: 'Move functions to appropriate scope level to improve code organization'
category: quality
severity: medium
tags: ['quality', 'maintainability', 'scoping', 'refactoring']
autofix: suggestions
principle: SRP
cleanCode: functions
cognitiveComplexity: true
affects: ['readability', 'maintainability', 'testability']
effort: low
---
```

## Example: Security Rule with Full Metadata

```yaml
---
title: no-eval
description: 'Prevent use of eval() which can execute arbitrary code'
category: security
severity: critical
tags: ['security', 'injection', 'cwe-95', 'owasp-a03']
autofix: false
cwe: CWE-95
owasp: A03:2021-Injection
---
```

## Tag Categories

### Security Tags

- Vulnerability types: `injection`, `xss`, `csrf`, `ssrf`, `xxe`, `authentication`, `authorization`
- Standards: `cwe-XXX`, `owasp-aXX`, `pci-dss`, `hipaa`, `gdpr`

### Quality Tags

- Concepts: `readability`, `maintainability`, `testability`, `complexity`, `duplication`
- Actions: `refactoring`, `code-smell`, `anti-pattern`, `best-practice`

### Technology Tags

- Languages: `typescript`, `javascript`, `jsx`, `tsx`
- Frameworks: `react`, `node`, `express`, `next`
- Domains: `browser`, `server`, `api`, `database`

### Severity Tags

- `critical` - Must fix, blocks deployment
- `high` - Should fix soon
- `medium` - Should fix when possible
- `low` - Nice to fix

## Template: Security Rule

```markdown
---
title: rule-name
description: '...'
category: security
severity: critical
tags: ['security', 'cwe-XXX']
autofix: false
cwe: CWE-XXX
owasp: A01:2021-Category
---

> **Keywords:** security, [specific keywords]

Brief description.

## Quick Summary

| Aspect       | Details                                               |
| ------------ | ----------------------------------------------------- |
| **Severity** | 🔴 Critical / 🟠 High / 🟡 Medium                     |
| **Category** | Security                                              |
| **Auto-Fix** | ❌ No                                                 |
| **CWE**      | [CWE-XXX](https://cwe.mitre.org/data/definitions/XXX) |
| **OWASP**    | A01:2021 - Category                                   |

## Why This Matters

| Risk | Impact | Mitigation |
| ---- | ------ | ---------- |
| 🔐   | ...    | ...        |

## Rule Details

...

## Examples

### ❌ Incorrect

### ✅ Correct

## Configuration

## Known False Negatives

## When Not To Use It

## Further Reading
```

## Template: Quality/Governance Rule

```markdown
---
title: rule-name
description: '...'
category: quality
severity: medium
tags: ['quality', 'maintainability']
autofix: suggestions
principle: SRP
cleanCode: functions
affects: ['readability', 'maintainability']
effort: low
---

> **Keywords:** quality, [specific keywords]

Brief description.

## Quick Summary

| Aspect        | Details                         |
| ------------- | ------------------------------- |
| **Severity**  | Warning (code quality)          |
| **Category**  | Quality                         |
| **Auto-Fix**  | ✅ Yes / 💡 Suggestions / ❌ No |
| **Principle** | Single Responsibility (SRP)     |
| **Effort**    | Low / Medium / High             |

## Why This Matters

| Issue | Impact | Solution |
| ----- | ------ | -------- |
| 📖    | ...    | ...      |
| 🔄    | ...    | ...      |

## Rule Details

...

## Examples

### ❌ Incorrect

### ✅ Correct

## Configuration

## Refactoring Patterns

### Pattern 1: ...

## When Not To Use It

## Related Rules

## Further Reading
```

## File Locations

1. **Package docs** (GitHub): `packages/eslint-plugin-{name}/docs/rules/{rule-name}.md`
2. **Docs app** (website): `apps/docs/content/docs/{plugin-name}/rules/{rule-name}.mdx`

Both files should have identical content.
