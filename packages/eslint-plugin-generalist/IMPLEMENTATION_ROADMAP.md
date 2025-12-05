# 📋 eslint-plugin-generalist Implementation Roadmap

**Domain-Based Architecture**: `eslint-plugin-generalist` is the "all-in-one" barrel that imports specialized domain plugins for optimal performance and flexibility.

## 🏗️ Architecture Overview

**AI-Era Generalist Philosophy**: Velocity over expertise through AI-enabled knowledge synthesis.

```
eslint-plugin-generalist (Barrel/Meta Package - "All-in-One")
├── eslint-plugin-expertise-security (36 rules)    # Deep security expertise
├── eslint-plugin-expertise-react (41 rules)       # React specialization
├── eslint-plugin-expertise-accessibility (37 rules) # A11y mastery
├── eslint-plugin-expertise-architecture (30 rules)  # System design
├── eslint-plugin-expertise-performance (7 rules)   # Performance optimization
└── eslint-plugin-expertise-development (7 rules)   # Development workflow

🎯 Community-Level Naming (Current Strategy)
├── eslint-plugin-security-expert (36 rules)    # Beat existing security plugins
├── eslint-plugin-react-expert (41 rules)       # Superior React linting
├── eslint-plugin-a11y-expert (37 rules)        # Advanced accessibility
├── eslint-plugin-architecture-expert (30 rules) # Expert system design
├── eslint-plugin-performance-expert (7 rules)  # Performance mastery
└── eslint-plugin-development-expert (7 rules) # Development best practices
```

**Naming Philosophy:**

- `*-expert`: Positions as superior alternatives to existing plugins
- `generalist`: The orchestrator that enables velocity through domain composition
- AI enables generalists to achieve specialist-level velocity and quality

**Competition Strategy:**

- `eslint-plugin-security` (existing) → `eslint-plugin-security-expert` (ours)
- `eslint-plugin-react` (existing) → `eslint-plugin-react-expert` (ours)
- `eslint-plugin-jsx-a11y` (existing) → `eslint-plugin-a11y-expert` (ours)
- Clear differentiation: "expert" = AI-enhanced, deeper rules, better coverage

**Benefits:**

- ✅ **Performance**: Users install only needed domains
- ✅ **Maintenance**: Focused packages are easier to maintain
- ✅ **Flexibility**: Mix and match domains as needed
- ✅ **Compatibility**: All-in-one experience still available
- ✅ **AI-Era Velocity**: Generalists can achieve specialist-level speed through AI knowledge synthesis

## 🤖 AI-Era Generalist Philosophy

**"Velocity over expertise through AI-enabled knowledge synthesis"**

### The Old Paradigm

- **Specialists**: Deep knowledge in one domain, slower adaptation
- **Generalists**: Broad knowledge, shallower expertise

### The AI-Era Paradigm

- **AI-Augmented Generalists**: Can rapidly acquire specialist-level knowledge in any domain
- **Velocity becomes the competitive advantage**: Ability to learn and apply expertise quickly
- **Domain composition**: Mix and match specialized tools for optimal outcomes

### Implementation in ESLint

```typescript
// Traditional approach: Choose one massive plugin
import monolithic from 'eslint-plugin-monolithic'; // 185 rules, all or nothing

// AI-era approach: Compose expertise domains
import security from 'eslint-plugin-security-expert'; // 36 rules - beats generic security plugins
import react from 'eslint-plugin-react-expert'; // 41 rules - superior React linting
import accessibility from 'eslint-plugin-a11y-expert'; // 37 rules - advanced accessibility

// Or use the generalist orchestrator
import generalist from 'eslint-plugin-generalist'; // All domains, your choice
```

**This architecture embodies the AI-era philosophy**: Users can be "generalists" by choosing their domains of expertise, while AI enables rapid learning and application across all domains.

## 🚀 Implementation Plan

### Phase 1: Extract Domain Packages

Create specialized packages by splitting `eslint-plugin` rules:

```bash
# Create new expertise domain packages (AI-era generalist philosophy)
packages/
├── eslint-plugin-expertise-security/       # 36 rules - Deep security knowledge
├── eslint-plugin-expertise-react/          # 41 rules - React specialization
├── eslint-plugin-expertise-accessibility/  # 37 rules - Accessibility mastery
├── eslint-plugin-expertise-architecture/   # 30 rules - System design expertise
├── eslint-plugin-expertise-performance/    # 7 rules - Performance optimization
├── eslint-plugin-expertise-development/    # 7 rules - Development workflow
└── eslint-plugin-generalist/               # Meta-package importing all above
```

### Phase 2: Domain Package Structure

Each domain package follows this structure:

```
packages/eslint-plugin-{domain}/
├── src/
│   ├── rules/          # Domain-specific rules
│   ├── configs/        # Domain-specific configs
│   ├── index.ts        # Export rules and configs
│   └── types.ts        # Domain types
├── package.json        # Domain package metadata
├── vitest.config.mts   # Test configuration
└── tsconfig.json       # TypeScript config
```

### Phase 3: Generalist Barrel Implementation

```typescript
// packages/eslint-plugin-generalist/src/index.ts
import security from 'eslint-plugin-security-expert';
import react from 'eslint-plugin-react-expert';
import accessibility from 'eslint-plugin-a11y-expert';
import architecture from 'eslint-plugin-architecture-expert';
import performance from 'eslint-plugin-performance-expert';
import development from 'eslint-plugin-dev-workflow-expert';

// Merge all rules and configs
export const rules = {
  ...security.rules,
  ...react.rules,
  ...accessibility.rules,
  ...architecture.rules,
  ...performance.rules,
  ...development.rules,
};

export const configs = {
  recommended: {
    plugins: ['@forge-js/generalist'],
    rules: {
      // Combined recommended rules from all domains
    },
  },
  // Domain-specific configs
  security: security.configs.recommended,
  react: react.configs.recommended,
  // ... etc
};

export default {
  rules,
  configs,
};
```

## 🛠️ Implementation Scripts

### Script 1: Extract Domain Packages

```bash
#!/bin/bash
# extract-domains.sh

DOMAINS=("expertise-security" "expertise-react" "expertise-accessibility" "expertise-architecture" "expertise-performance" "expertise-development")

for domain in "${DOMAINS[@]}"; do
  echo "Creating eslint-plugin-$domain..."

  # Create package directory
  mkdir -p "packages/eslint-plugin-$domain"

  # Copy domain rules
  mkdir -p "packages/eslint-plugin-$domain/src/rules"
  cp -r "packages/eslint-plugin/src/rules/$domain/"* "packages/eslint-plugin-$domain/src/rules/"

  # Copy shared utilities
  cp -r "packages/eslint-plugin/src/utils" "packages/eslint-plugin-$domain/src/"
  cp -r "packages/eslint-plugin/src/types" "packages/eslint-plugin-$domain/src/"

  # Create package.json
  # Create index.ts
  # Create configs
  # Create tests
done
```

### Script 2: Update Generalist Barrel

```typescript
// update-generalist.js
const domains = [
  'security',
  'react',
  'accessibility',
  'architecture',
  'performance',
  'development',
];

const imports = domains
  .map((d) => `import ${d} from '@forge-js/eslint-plugin-${d}';`)
  .join('\n');
const ruleMerges = domains.map((d) => `  ...${d}.rules,`).join('\n');
const configMerges = domains
  .map((d) => `  ${d}: ${d}.configs.recommended,`)
  .join('\n');

console.log(`${imports}

// Merge all rules and configs
export const rules = {
${ruleMerges}
};

export const configs = {
  recommended: {
    plugins: ['@forge-js/generalist'],
    rules: {
      // Combined recommended rules from all domains
    }
  },
${configMerges}
};

export default {
  rules,
  configs,
};`);
```

```

## 📈 Progress Dashboard

| Source Plugin                | Total Rules | Implemented | % Complete | Priority            |
| :--------------------------- | :---------- | :---------- | :--------- | :------------------ |
| **`eslint-plugin-security`** | ~14         | ~12         | **85%**    | Critical            |
| **Security Rules Roadmap**   | 25          | 0           | **0%**     | Critical            |
| **`eslint-plugin-react`**    | ~100+       | ~41         | **40%**    | High                |
| **`eslint-plugin-import`**   | ~66         | ~7          | **10%**    | High                |
| **`eslint-plugin-unicorn`**  | ~100+       | ~5          | **5%**     | Medium              |
| **`eslint-plugin-jsx-a11y`** | ~50+        | 3           | **5%**     | Low (Out of Scope?) |
| **Total Security Coverage**  | ~39         | ~12         | **30%**    | -                   |

## 🚀 Phase 1: Feature Parity (The "Must Haves")

Focus on the rules that prevent bugs and security holes.

### Architecture (`import`)

- [ ] `no-cycle` (Done via `no-circular-dependencies`)
- [ ] `no-unresolved` (Done)
- [ ] `no-restricted-paths` (Priority: High)
- [ ] `no-internal-modules` (Priority: High)

### React

- [ ] `hooks-rules` (Done)
- [ ] `exhaustive-deps` (Done)
- [ ] `jsx-key` (Priority: Critical)
- [ ] `no-unstable-nested-components` (Priority: Critical)
- [ ] `jsx-no-target-blank` (Priority: Critical - Security)

### Security (Phase 1A: Core Security)

- [ ] `detect-object-injection` (Refine false positives)
- [ ] `no-unsafe-regex` (Done)

## 🚀 Phase 1B: Advanced Security Rules (From SECURITY_RULES_ROADMAP.md)

### Security Implementation Strategy:

1. **Phase 1A**: Complete core security rules (detect-object-injection refinement)
2. **Phase 1B**: Implement all 10 Critical priority rules
3. **Phase 2**: Implement all 10 High priority rules
4. **Phase 3**: Implement remaining 5 Medium priority rules

### Security Coverage Target:

- **After Phase 1B**: ~50% security coverage (22/39 rules)
- **After Phase 2**: ~75% security coverage (32/39 rules)
- **After Phase 3**: ~90% security coverage (37/39 rules)

This positions `eslint-plugin-generalist` as the **most comprehensive security ESLint plugin** available.

### Critical Priority Security Rules (10 rules)

- [ ] `no-prototype-pollution` - CWE-1321 (Prototype pollution detection)
- [ ] `no-insecure-jwt` - CWE-347 (JWT security vulnerabilities)
- [ ] `no-timing-attack` - CWE-208 (Timing attack vulnerabilities)
- [ ] `no-graphql-injection` - CWE-89, CWE-400 (GraphQL injection & DoS)
- [ ] `no-xxe-injection` - CWE-611 (XXE/XML external entity injection)
- [ ] `no-xpath-injection` - CWE-643 (XPath injection)
- [ ] `no-ldap-injection` - CWE-90 (LDAP injection)
- [ ] `no-unsafe-deserialization` - CWE-502 (Deserialization of untrusted data)
- [ ] `no-zip-slip` - CWE-22 (Zip slip/archive extraction vulnerabilities)
- [ ] `no-buffer-overread` - CWE-126 (Buffer over-read)

### High Priority Security Rules (10 rules)

- [ ] `no-insufficient-postmessage-validation` - CWE-20 (postMessage validation)
- [ ] `no-clickjacking` - CWE-1021 (Clickjacking prevention)
- [ ] `no-weak-password-recovery` - CWE-640 (Weak password recovery)
- [ ] `no-improper-type-validation` - CWE-1287 (Type validation issues)
- [ ] `no-unchecked-loop-condition` - CWE-400, CWE-606 (Loop condition DoS)
- [ ] `no-unlimited-resource-allocation` - CWE-770 (Resource allocation limits)
- [ ] `no-directive-injection` - CWE-96 (Template directive injection)
- [ ] `no-format-string-injection` - CWE-134 (Format string injection)
- [ ] `no-improper-sanitization` - CWE-94, CWE-79, CWE-116 (Code sanitization)
- [ ] `no-electron-security-issues` - CWE-16 (Electron security issues)

### Medium Priority Security Rules (5 rules)

- [ ] `no-introspection-enabled` - CWE-200 (GraphQL introspection in production)
- [ ] `no-xml-external-entity` - CWE-611 (XML external entity reference)
- [ ] `no-origin-validation-error` - CWE-942, CWE-346 (CORS origin validation)
- [ ] `no-permissive-crossdomain` - CWE-942 (Cross-domain policy issues)
- [ ] `no-unsafe-jquery-plugin` - CWE-79, CWE-116 (Unsafe jQuery usage)

## 🚀 Phase 2: The "Nice to Haves" (Unicorn/Style)

Focus on rules that make code cleaner and more modern.

- [ ] `prefer-node-protocol` (Done)
- [ ] `prefer-at` (Done)
- [ ] `no-process-exit` (Done)
- [ ] `prefer-includes`
- [ ] `prefer-set-has`

## 🚀 Phase 3: Accessibility (Future)

Decide if we want to tackle `jsx-a11y`. It is large and complex.

- [ ] `alt-text` (Done as `img-requires-alt`)
- [ ] `aria-role`
- [ ] `aria-props`

## 🛠️ Development Guidelines for AI Agents

When implementing a new rule:

1.  **Check the TODOs:** Look at the specific `todo-*.md` file for the plugin you are porting from.
2.  **Use `formatLLMMessage`:** Ensure the error message follows the structured 2-line format.
3.  **Add CWE:** If it's a security or stability issue, find the matching CWE.
4.  **Deterministic Fix:** If possible, provide a fix. If not, provide a specific instruction.
5.  **Test Cases:** Create `valid` and `invalid` test cases covering edge cases.

---

**Links to Detailed TODOs:**

- [Import Rules](./todo-import-rules.md)
- [React Rules](./todo-react-rules.md)
- [Security Rules](./todo-security-rules.md)
- [Unicorn Rules](./todo-unicorn-rules.md)
- [Full Security Roadmap](../../SECURITY_RULES_ROADMAP.md)
```
