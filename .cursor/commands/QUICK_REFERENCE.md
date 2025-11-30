# Cursor Commands Quick Reference

## 🚀 Available Commands

Type these commands in Cursor chat to automatically include the relevant checklist:

| Command | Checklist | Use Case |
|---------|-----------|----------|
| `/eslint-rule` | ESLint Rule Addition | Adding new ESLint rules |
| `/new-package` | New Package Addition | Creating new packages |
| `/workflow-maintenance` | Workflow Maintenance | Working with GitHub Actions |
| `/llm-discoverability` | LLM Discoverability | Optimizing for AI tooling |

## 📝 Usage Examples

### Example 1: Adding a New ESLint Rule

```
/eslint-rule

I want to add a new rule that detects unsafe dynamic requires.
```

### Example 2: Creating a New Package

```
/new-package

I need to create a new package called @forge-js/test-utils
```

### Example 3: Updating a Workflow

```
/workflow-maintenance

I need to update the CI workflow to add a new test step.
```

### Example 4: Optimizing Package for LLMs

```
/llm-discoverability

I want to optimize the eslint-plugin package for better LLM discoverability.
```

## 🔧 How Commands Work

These commands are TypeScript files in `.cursor/commands/` that:

1. Read the corresponding checklist markdown file
2. Inject the complete checklist content into your prompt
3. Ensure the LLM has full context before starting work

## 📚 Checklist Locations

- ESLint Rule: `.cursorrules/eslint-rule-checklist.md`
- New Package: `.cursorrules/add-new-package-checklist.md`
- Workflow Maintenance: `.cursorrules/workflow-maintenance-checklist.md`
- LLM Discoverability: `LLM_DISCOVERABILITY_CHECKLIST.md`

## ⚠️ Troubleshooting

If a command doesn't work:

1. **Check file exists:** Verify the checklist file exists at the expected path
2. **Check Cursor version:** Ensure you're using a recent version of Cursor
3. **Manual fallback:** You can always manually reference the checklist files
4. **Check logs:** Look for errors in Cursor's command execution logs

## 💡 Tips

- **Combine commands:** You can use multiple commands in one prompt
- **Be specific:** After using a command, describe what you want to do
- **Review checklist:** The checklist will be included in the prompt, so review it if needed

## 🔄 Alternative: Manual Reference

If commands don't work, you can manually reference checklists:

```
Please follow the checklist in .cursorrules/eslint-rule-checklist.md when adding this new rule.
```

