---
title: no-unbounded-batch-processing
description: Detect processing batch records without size validation
tags: ['serverless', 'lambda', 'cwe-770', 'batch', 'aws']
category: security
severity: medium
cwe: CWE-770
autofix: false
---

> **Keywords:** Lambda, batch, SQS, Records, size limit, CWE-770, AWS, serverless, denial of service
> **CWE:** [CWE-770](https://cwe.mitre.org/data/definitions/770.html)


<!-- @rule-summary -->
Detect processing batch records without size validation
<!-- @/rule-summary -->

Detects Lambda handlers processing batch records (SQS, SNS, DynamoDB Streams) without validating batch size. This rule is part of [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) and provides LLM-optimized error messages.

**⚠️ Security/Reliability rule** | **💡 Provides suggestions** | **📋 Set to warn in `recommended`**

## Quick Summary

| Aspect            | Details                                                                      |
| ----------------- | ---------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-770](https://cwe.mitre.org/data/definitions/770.html) (Resource Limits) |
| **Severity**      | Medium (security/reliability)                                                |
| **Auto-Fix**      | 💡 Suggests batch size validation                                            |
| **Category**      | Security                                                                     |
| **Best For**      | Lambda functions processing SQS, SNS, DynamoDB, Kinesis events               |

## Vulnerability and Risk

**Vulnerability:** When Lambda functions process batch events without checking the batch size, large batches can cause memory exhaustion or timeout before completing all records.

**Risk:** Without size validation:

- Large batches may exceed Lambda memory limits
- Processing may timeout, leaving records in limbo
- Attackers can craft large payloads to cause DoS
- Partial processing leaves inconsistent state

## Rule Details

This rule detects access to `event.Records` (and similar batch properties) without accompanying size validation like `.length` checks or `.slice()` limiting.

## Why This Matters

| Risk                     | Impact                                | Solution                         |
| ------------------------ | ------------------------------------- | -------------------------------- |
| 💥 **Memory Exhaustion** | Lambda OOM crash                      | Limit batch processing size      |
| ⏱️ **Timeout**           | Incomplete processing, retries        | Process in bounded chunks        |
| 🔄 **Retries**           | Same large batch retried indefinitely | Use batch item failure reporting |

## Configuration

| Option         | Type      | Default | Description                       |
| -------------- | --------- | ------- | --------------------------------- |
| `allowInTests` | `boolean` | `true`  | Allow in test files               |
| `maxBatchSize` | `number`  | `100`   | Maximum batch size before warning |

```javascript
{
  rules: {
    'lambda-security/no-unbounded-batch-processing': ['warn', {
      allowInTests: true,
      maxBatchSize: 100
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
// SQS batch processing without size check
export const handler = async (event) => {
  for (const record of event.Records) {
    // ❌ No size validation
    await processRecord(record);
  }
  return { statusCode: 200 };
};

// Map without size limit
export const handler = async (event) => {
  const results = await Promise.all(
    event.Records.map((record) => processRecord(record)), // ❌ Unbounded concurrency
  );
};
```

### ✅ Correct

```typescript
const MAX_BATCH_SIZE = 10;

// Validate batch size
export const handler = async (event) => {
  if (event.Records.length > MAX_BATCH_SIZE) {
    // ✅ Size check
    console.warn(`Large batch: ${event.Records.length} records`);
    throw new Error('Batch too large');
  }

  for (const record of event.Records) {
    await processRecord(record);
  }
};

// Or use slice to limit
export const handler = async (event) => {
  const limitedRecords = event.Records.slice(0, MAX_BATCH_SIZE); // ✅ Limit batch

  const failures = [];
  for (const record of limitedRecords) {
    try {
      await processRecord(record);
    } catch (error) {
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  // Report partial batch failures (SQS)
  return { batchItemFailures: failures };
};
```

### ✅ Best Practice: Controlled Concurrency

```typescript
import pLimit from 'p-limit';

const MAX_CONCURRENT = 5;
const limit = pLimit(MAX_CONCURRENT);

export const handler = async (event) => {
  // Validate size
  if (event.Records.length > 100) {
    throw new Error('Batch exceeds maximum size');
  }

  // Process with controlled concurrency
  const results = await Promise.allSettled(
    event.Records.map(
      (record) => limit(() => processRecord(record)), // ✅ Bounded concurrency
    ),
  );

  // Report failures
  const failures = results
    .map((result, i) =>
      result.status === 'rejected'
        ? { itemIdentifier: event.Records[i].messageId }
        : null,
    )
    .filter(Boolean);

  return { batchItemFailures: failures };
};
```

## AWS Batch Source Properties

| Event Source     | Property  | Max Size | Notes                           |
| ---------------- | --------- | -------- | ------------------------------- |
| SQS              | `Records` | 10,000   | Configurable in trigger         |
| SNS              | `Records` | Varies   | Fanout can create large batches |
| DynamoDB Streams | `Records` | 10,000   | Stream shards                   |
| Kinesis          | `Records` | 10,000   | Shard iterator                  |
| S3               | `Records` | Varies   | Event notifications             |

## Related Rules

- [`require-timeout-handling`](./require-timeout-handling.md) - Handle timeouts gracefully
- [`no-error-swallowing`](./no-error-swallowing.md) - Log processing errors

## Known False Negatives

### External Size Validation

**Why**: Validation functions not tracked.

```typescript
// ❌ NOT DETECTED - external validation
function validateBatch(records) {
  if (records.length > 100) throw new Error('Too large');
}

export const handler = async (event) => {
  validateBatch(event.Records);
  // Rule doesn't know validation occurred
  for (const record of event.Records) { ... }
};
```

**Mitigation**: Keep validation inline or in same function.

## Further Reading

- **[Lambda SQS Event Source](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html)** - AWS documentation
- **[CWE-770: Allocation Without Limits](https://cwe.mitre.org/data/definitions/770.html)** - Official CWE entry
- **[Partial Batch Responses](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#services-sqs-batchfailurereporting)** - SQS failure reporting