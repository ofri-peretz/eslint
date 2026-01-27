# Known False Negatives and False Positives

This document catalogs known limitations in modularity rules.

## DDD Rules

### `ddd-anemic-domain-model`

**Known False Negatives (Not Detected)**

- Classes with many methods that are all simple delegations
- Anemic behavior hidden behind inherited methods from base class
- Classes that appear rich but delegate all logic to external services

**Known False Positives (Incorrectly Flagged)**

- DTOs and Value Objects (intentionally data-only)
- Entities in early development stages
- Classes using composition patterns with injected behavior

---

### `ddd-value-object-immutability`

**Known False Negatives (Not Detected)**

- Mutability through nested object references
- Array properties that can be mutated (push, splice)
- Properties mutated through getters returning references

**Known False Positives (Incorrectly Flagged)**

- Classes using `Object.freeze` in constructor (correctly immutable)
- Value objects with builder patterns that return new instances
- Immutable.js or similar library usage

---

## Architecture Rules

### `enforce-naming`

**Known False Negatives (Not Detected)**

- Incorrect terminology in comments or strings
- Domain terms split across multiple identifiers
- Dynamically constructed identifiers

**Known False Positives (Incorrectly Flagged)**

- Legitimate use of term in different context (e.g., "user" in "userAgent")
- Third-party library identifiers that can't be changed
- Technical terms that happen to contain domain words

---

### `enforce-rest-conventions`

**Known False Negatives (Not Detected)**

- Routes defined using string templates
- Routes generated dynamically at runtime
- RESTful issues in non-Express/Fastify frameworks

**Known False Positives (Incorrectly Flagged)**

- Intentionally singular resources (e.g., `/me`, `/current-user`)
- RPC-style endpoints that are intentionally non-RESTful
- Versioned APIs with different conventions

---

### `no-external-api-calls-in-utils`

**Known False Negatives (Not Detected)**

- API calls through dependency-injected clients
- Indirect calls through imported service modules
- API calls using wrapper functions

**Known False Positives (Incorrectly Flagged)**

- HTTP utilities that wrap fetch for error handling
- API client configuration utilities
- Mocking utilities for testing

---

## Mitigation Strategies

1. **Domain Modeling**: Document your domain language in a glossary
2. **Code Reviews**: Use DDD tactical patterns as review checklist
3. **Testing**: Add behavioral tests that verify domain invariants
4. **Documentation**: Keep bounded context maps up to date
