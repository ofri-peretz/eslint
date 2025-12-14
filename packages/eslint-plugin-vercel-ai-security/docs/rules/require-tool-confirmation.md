# `require-tool-confirmation`

> Requires human confirmation for destructive tool operations.

## 📊 Rule Details

| Property           | Value                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| **Type**           | suggestion                                                                                             |
| **Severity**       | 🟡 HIGH                                                                                                |
| **OWASP LLM**      | [LLM06: Excessive Agency](https://owasp.org/www-project-top-10-for-large-language-model-applications/) |
| **OWASP Agentic**  | [ASI09: Human-Agent Trust Exploitation](https://owasp.org)                                             |
| **CWE**            | [CWE-862: Missing Authorization](https://cwe.mitre.org/data/definitions/862.html)                      |
| **CVSS**           | 7.5                                                                                                    |
| **Config Default** | `warn` (recommended), `error` (strict)                                                                 |

## 🔍 What This Rule Detects

This rule identifies destructive tools (delete, transfer, execute, etc.) that don't require human confirmation before execution.

## ❌ Incorrect Code

```typescript
// Delete without confirmation
const tools = {
  deleteFile: {
    execute: async ({ path }) => fs.unlinkSync(path),
  },
};

// Transfer without confirmation
const tools = {
  transferFunds: {
    execute: async ({ amount, to }) => bank.transfer(amount, to),
  },
};

// Execute without confirmation
const tools = {
  executeCommand: {
    execute: async ({ cmd }) => exec(cmd),
  },
};
```

## ✅ Correct Code

```typescript
// Delete with confirmation
const tools = {
  deleteFile: {
    requiresConfirmation: true,
    execute: async ({ path }) => fs.unlinkSync(path),
  },
};

// Transfer with approval
const tools = {
  transferFunds: {
    requiresApproval: true,
    execute: async ({ amount, to }) => bank.transfer(amount, to),
  },
};

// Execute with confirmation
const tools = {
  executeCommand: {
    confirm: true,
    execute: async ({ cmd }) => exec(cmd),
  },
};
```

## ⚙️ Options

| Option                | Type       | Default                                                                                            | Description                               |
| --------------------- | ---------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------- | ---------- | --------------------------------------------------------------------- | ----------------------------------- |
| `destructivePatterns` | `string[]` | `['delete', 'remove', 'drop', 'transfer', 'send', 'execute', 'run', 'update', 'modify', 'create']` | Tool name patterns requiring confirmation | // `confirmationProperties` | `string[]` | `['requiresConfirmation', 'requiresApproval', 'confirm', 'approval']` | Properties that enable confirmation |

## 🛡️ Why This Matters

Unconfirmed destructive operations can cause:

- **Data loss** - Files or records deleted without consent
- **Financial loss** - Unauthorized transfers
- **Security breach** - Malicious commands executed
- **Compliance violations** - Actions without audit trail

## 🔗 Related Rules

- [`require-tool-schema`](./require-tool-schema.md) - Validate tool inputs
- [`require-audit-logging`](./require-audit-logging.md) - Log AI operations

## 📚 References

- [OWASP LLM06: Excessive Agency](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [OWASP ASI09: Human-Agent Trust Exploitation](https://owasp.org)
- [CWE-862: Missing Authorization](https://cwe.mitre.org/data/definitions/862.html)
