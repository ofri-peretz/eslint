# Documentation Maintenance Guide

When adding or modifying documentation, follow these principles to keep everything maintainable as the plugin grows.

## 🎯 Core Principle

**Link to sources, don't hardcode counts.**

As we grow from 19 rules → 63 rules across 6 phases, hardcoded numbers become stale. Instead, reference actual source files.

## ✅ DO

```markdown
✅ "For the current list of types, see [src/types/index.ts](./src/types/index.ts)"
✅ "The plugin exports types for all available ESLint rules"
✅ "Types are organized into categories (Accessibility, Architecture, ...)"
```

## ❌ DON'T

```markdown
❌ "The plugin exports 20 types from 19 rules"
❌ "All 11 categories are covered"
❌ "16 remaining rule docs need updates"
```

## 🔍 Source of Truth

When you need current counts:

```bash
# Count type exports
grep "^export type" packages/eslint-plugin/src/types/index.ts | wc -l

# Count rule docs
ls packages/eslint-plugin/docs/rules/*.md | wc -l

# See future plans
cat ROADMAP.md | grep -A 20 "Current Status"
```

## 📋 Documentation Checklist

When creating/updating documentation:

- [ ] No hardcoded rule/type counts
- [ ] Links to source files instead of copying data
- [ ] Reference ROADMAP.md for future context
- [ ] Use generic language ("current rules", "available types")
- [ ] Include bash commands for verification if helpful

## 🚀 Adding New Rules

No documentation maintenance needed! Just:

1. Implement rule
2. Export from `src/types/index.ts`
3. Create docs in `docs/rules/`
4. Update ROADMAP.md if starting new phase

Counts automatically stay accurate because documentation references the actual files.

---

**See also:**

- [ROADMAP.md](../../ROADMAP.md) - Future phases
- [src/types/README.md](./src/types/README.md) - Types usage
- [RULE_DOCS_UPDATE_GUIDE.md](./RULE_DOCS_UPDATE_GUIDE.md) - Contributing rule docs
