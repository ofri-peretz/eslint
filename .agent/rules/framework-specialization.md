---
description: Standards for framework-specific security rules in the Interlace ecosystem.
---

# Framework Specialization Standards

## Backend Framework Support

The Interlace ESLint ecosystem supports three primary backend frameworks for specialized security rule implementation:

1.  **Express** (`eslint-plugin-express-security`): Rules targeting Express.js, middleware, and standard Node.js server patterns.
2.  **NestJS** (`eslint-plugin-nestjs-security`): Rules targeting NestJS decorators, controllers, services, and modular architecture.
3.  **Lambda** (`eslint-plugin-lambda-security`): Rules targeting AWS Lambda handlers, event parsing, and serverless-specific security risks.

## Rule Distribution Pattern

When implementing security rules that interact with framework APIs (like routing, middleware, or dependency injection):

- **Specialization over Generalization**: Prefer framework-specific plugins for rules that rely on framework-specific AST patterns (e.g., `@Controller()` in NestJS vs `app.get()` in Express).
- **Pure Logic**: Keep `eslint-plugin-secure-coding` restricted to pure coding logic, language-level vulnerabilities, and platform-agnostic patterns (Regex, Injection, etc.).
- **Cross-Framework Parity**: When a security concept (like "Exposed Debug Endpoints") applies to multiple frameworks, implement it specifically within each relevant plugin to ensure high-fidelity detection.

## Implementation Guidelines

### Express

- Focus on `app.use()`, `router.route()`, and middleware chains.
- Detect insecure `req`/`res` patterns.
- Identify unauthenticated administrative routes.

### NestJS

- Focus on Decorators (`@Get`, `@Post`, `@Guard`, `@UsePipes`).
- Analyze class-level configurations (Controllers and Modules).
- Integrate with `class-validator` and `class-transformer` patterns.

### Lambda (Serverless)

- Focus on the `handler` function signature and `event`/`context` objects.
- Detect insecure handling of API Gateway proxy events.
- Identify sensitive data leakage in CloudWatch logs or unvalidated event triggers.
