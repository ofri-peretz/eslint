# require-human-approval-for-critical-actions

Require human confirmation before destructive or financial LLM actions.

**OWASP LLM Top 10 2025**: LLM06 - Excessive Agency  
**CWE**: [CWE-284](https://cwe.mitre.org/data/definitions/284.html)  
**Severity**: 🔴 Critical

## Rule Details

Requires explicit human approval for critical actions (delete, transfer, payment, destroy).

### ❌ Incorrect

```typescript
await deleteUser(userId);
await transferMoney(amount);
await processPayment(card);
```

### ✅ Correct

```typescript
if (await confirmed(user, 'delete')) {
  await deleteResource(id);
}

const approved = await requireApproval(user, action);
if (approved) {
  await transferFunds(amount);
}
```

## Options

```json
{
  "secure-coding/require-human-approval-for-critical-actions": [
    "error",
    {
      "criticalActions": ["delete", "transfer", "payment", "destroy"]
    }
  ]
}
```

## Best Practices

Implement 2FA for critical actions. Log all approval requests and decisions.

## Version

Introduced in v2.3.0
