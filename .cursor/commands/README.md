# Cursor Commands - ESLint Monorepo

This directory contains Cursor IDE commands that inject checklists into prompts for consistent development workflows.

## 📋 Available Commands

### `/eslint-rule`

**Purpose:** Include the ESLint Rule Addition Checklist

**When to use:**
- Adding a new ESLint rule to any `@interlace/eslint-plugin-*` package
- Creating rule documentation
- Updating rule exports

**Usage:**
```
/eslint-rule
```

This will inject the complete ESLint Rule Addition Checklist into your prompt.

---

### `/new-package`

**Purpose:** Include the New Package Addition Checklist

**When to use:**
- Creating a new package in the `packages/` directory
- Setting up a new npm package for publishing
- Adding packages that need to be released

**Usage:**
```
/new-package
```

This will inject the complete New Package Addition Checklist into your prompt.

---

### `/workflow-maintenance`

**Purpose:** Include the GitHub Workflow Maintenance Checklist

**When to use:**
- Adding a new GitHub Actions workflow
- Updating an existing workflow
- Changing workflow patterns/format
- Adding new error handling patterns
- Modifying Nx Cloud integration

**Usage:**
```
/workflow-maintenance
```

This will inject the complete GitHub Workflow Maintenance Checklist into your prompt.

---

### `/llm-discoverability`

**Purpose:** Include the LLM Discoverability Checklist

**When to use:**
- Optimizing packages for LLM discoverability
- Adding AGENTS.md files
- Enhancing package metadata
- Improving documentation structure

**Usage:**
```
/llm-discoverability
```

This will inject the complete LLM Discoverability Checklist into your prompt.

---

## 🚀 How It Works

These commands are Markdown files (`.md`) in `.cursor/commands/` that contain the complete checklist content. When you type a command like `/eslint-rule` in Cursor chat, Cursor automatically injects the content of the corresponding Markdown file into your prompt. This ensures:

1. **Consistency:** The LLM always has access to the complete, up-to-date checklist
2. **Completeness:** No checklist items are missed
3. **Context:** The LLM understands the full requirements before starting work

**Note:** Cursor commands must be plain Markdown files (`.md`), not TypeScript or other formats.

## 📝 Adding New Commands

To add a new command:

1. Create a new Markdown file in `.cursor/commands/` (e.g., `my-command.md`)
2. Write the checklist content directly in that file (this directory is the canonical location — there is no separate source-of-truth folder)
3. Optionally add a brief header explaining the command's purpose
4. Update this README with the new command documentation

**Example:**
```markdown
# My Checklist Title

> **Purpose:** Brief description of what this checklist is for.

**⚠️ CRITICAL:** Important note about following this checklist.

## Checklist Items

- [ ] Item 1
- [ ] Item 2
...
```

## 🔍 Troubleshooting

If a command fails to load:

1. Verify the checklist file exists at the expected path
2. Check file permissions
3. Ensure the path in the command file is correct
4. Check Cursor's command execution logs

## 📚 Related Documentation

- [Architecture](../../ARCHITECTURE.md) — repo layout and the rule that decides where new code goes
- [Quality Standards](../../docs/QUALITY_STANDARDS.md) — production-ready checklist for ESLint rules
- [Plugin Review Workflow](../../docs/PLUGIN-REVIEW-WORKFLOW.md) — review process referenced from the eslint-rule command
- [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) — which ESLint majors we support and the peer-dep range

