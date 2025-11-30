# Cursor Commands Setup

## ✅ What Was Created

I've created a command system that allows you to quickly inject checklists into your Cursor prompts using simple commands like `/eslint-rule`.

### Files Created

1. **Command Files** (Markdown):
   - `.cursor/commands/eslint-rule.md` - ESLint Rule checklist
   - `.cursor/commands/new-package.md` - New Package checklist
   - `.cursor/commands/workflow-maintenance.md` - Workflow Maintenance checklist
   - `.cursor/commands/llm-discoverability.md` - LLM Discoverability checklist

2. **Documentation**:
   - `.cursor/commands/README.md` - Full command documentation
   - `.cursor/commands/QUICK_REFERENCE.md` - Quick reference guide
   - `.cursor/commands/SETUP.md` - Setup and troubleshooting guide

3. **Updated**:
   - `.cursorrules/README.md` - Added command quick start section
   - `.cursor/commands/README.md` - Updated to reflect Markdown format

## 🚀 How to Use

### Basic Usage

Simply type the command in Cursor chat:

```
/eslint-rule
```

This will automatically include the complete ESLint Rule Addition Checklist in your prompt.

### With Context

You can combine commands with your request:

```
/eslint-rule

I want to add a new rule that detects unsafe dynamic requires. The rule should check for patterns like require(variable) and suggest using a whitelist approach.
```

### Available Commands

| Command | What It Does |
|---------|-------------|
| `/eslint-rule` | Includes ESLint Rule Addition Checklist |
| `/new-package` | Includes New Package Addition Checklist |
| `/workflow-maintenance` | Includes Workflow Maintenance Checklist |
| `/llm-discoverability` | Includes LLM Discoverability Checklist |

## 🔧 How It Works

Each command is a Markdown file (`.md`) that:
1. Contains the complete checklist content directly in the file
2. Gets automatically injected into your prompt when you type the command
3. Ensures the LLM has full context before starting work

**Note:** Cursor commands must be plain Markdown files, not TypeScript or other formats.

This ensures the LLM always has the complete, up-to-date checklist context.

## ⚠️ Troubleshooting

### Command Not Working?

1. **Check Cursor Version**: Ensure you're using a recent version of Cursor that supports custom commands
2. **Check File Format**: Commands must be Markdown (`.md`) files, not TypeScript or other formats
3. **Check File Location**: Commands must be in `.cursor/commands/` directory at workspace root
4. **Restart Cursor**: After adding or modifying command files, restart Cursor to refresh the command palette
5. **Manual Fallback**: You can always manually reference checklists:
   ```
   Please follow the checklist in .cursorrules/eslint-rule-checklist.md
   ```

## 📝 Testing

To test if commands work:

1. Open Cursor chat
2. Type `/eslint-rule`
3. Check if the checklist content appears in the prompt
4. If not, check Cursor's command execution logs

## 🎯 Next Steps

1. **Test the commands** in Cursor to see if they work
2. **Report any issues** so we can adjust the format
3. **Add more commands** if you have other checklists you want to include

## 💡 Tips

- **Combine commands**: You can use multiple commands in one prompt
- **Be specific**: After using a command, describe what you want to do
- **Review checklist**: The checklist will be included, so review it if needed
- **Update checklists**: When you update checklist files, commands will automatically use the new content

