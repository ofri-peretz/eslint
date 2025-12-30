# AGENTS.md

> Context for AI coding agents working on eslint-plugin-react-a11y

## Setup Commands

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build this package
nx build eslint-plugin-react-a11y

# Run tests
nx test eslint-plugin-react-a11y

# Run tests with coverage
nx test eslint-plugin-react-a11y --coverage

# Lint this package
nx lint eslint-plugin-react-a11y
```

## Code Style

- TypeScript strict mode with `@interlace/eslint-devkit` types
- Use `AST_NODE_TYPES` constants, never string literals for node types
- Use `formatLLMMessage()` for all rule error messages
- Include WCAG reference in every accessibility message
- Use `c8 ignore` comments with documented reasons for untestable code
- Single-pass AST traversal patterns (O(n) complexity)

## Testing Instructions

- Tests use `@typescript-eslint/rule-tester` with Vitest
- Each rule has `index.ts` (implementation) and `*.test.ts` (tests) in same directory
- Run specific rule test: `nx test eslint-plugin-react-a11y --testPathPattern="img-requires-alt"`
- Coverage target: ≥90% lines, ≥95% functions
- All tests must pass before committing

## Project Structure

```
src/
├── index.ts          # Plugin entry, 4 configs
└── rules/            # 37 rule directories
    └── [rule-name]/
        ├── index.ts       # Rule implementation
        └── *.test.ts      # Rule tests
```

## Plugin Purpose

React accessibility ESLint plugin with **37 LLM-optimized rules** for WCAG 2.1 compliance. Covers anchor elements, ARIA attributes, form controls, images, interactive elements, and focus management.

## Available Presets

| Preset        | Description                             |
| ------------- | --------------------------------------- |
| `recommended` | Balanced accessibility (37 rules mixed) |
| `strict`      | All 37 rules as errors                  |
| `wcag-a`      | WCAG 2.1 Level A compliance (16 rules)  |
| `wcag-aa`     | WCAG 2.1 Level AA compliance (24 rules) |

## Rule Categories

| Category | Rules                                                                                        | WCAG         |
| -------- | -------------------------------------------------------------------------------------------- | ------------ |
| Anchor   | `anchor-ambiguous-text`, `anchor-has-content`, `anchor-is-valid`                             | 2.4.4        |
| ARIA     | `aria-activedescendant-has-tabindex`, `aria-props`, `aria-role`, `aria-unsupported-elements` | 4.1.2        |
| Forms    | `autocomplete-valid`, `control-has-associated-label`, `label-has-associated-control`         | 1.3.1, 1.3.5 |
| Events   | `click-events-have-key-events`, `mouse-events-have-key-events`                               | 2.1.1        |
| Images   | `img-redundant-alt`, `img-requires-alt`                                                      | 1.1.1        |
| Focus    | `interactive-supports-focus`, `no-autofocus`, `tabindex-no-positive`                         | 2.4.3        |

## Error Message Format

All rules produce WCAG-referenced messages:

```
♿ WCAG 1.1.1 | Image missing alt text | CRITICAL
   Fix: Add alt="Descriptive text about image" | https://www.w3.org/WAI/tutorials/images/
```

## Common Fix Patterns

```tsx
// Image alt (WCAG 1.1.1)
// BAD: <img src="photo.jpg" />
// GOOD: <img src="photo.jpg" alt="Description of image" />

// Anchor content (WCAG 2.4.4)
// BAD: <a href="/page">Click here</a>
// GOOD: <a href="/page">View product details</a>

// Form labels (WCAG 1.3.1)
// BAD: <input type="text" />
// GOOD: <label>Name: <input type="text" /></label>
// GOOD: <input type="text" aria-label="Name" />

// Keyboard events (WCAG 2.1.1)
// BAD: <div onClick={handleClick}>...</div>
// GOOD: <div onClick={handleClick} onKeyDown={handleKeyDown} tabIndex={0}>...</div>
```

## Security Considerations

- All rules map to WCAG 2.1 success criteria
- Covers Level A, AA, and AAA requirements
- Prevents common accessibility anti-patterns
