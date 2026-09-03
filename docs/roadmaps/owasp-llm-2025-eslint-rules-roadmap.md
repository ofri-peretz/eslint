# ESLint Rules for OWASP Top 10 for LLM Applications 2025

## Executive Summary

This document provides a comprehensive roadmap of **ESLint security rules** mapped to the **OWASP Top 10 for LLM Applications 2025**. It includes:

- ✅ **Existing rules** in `eslint-plugin-secure-coding`
- 🆕 **New rules** needed for comprehensive LLM/AI Agent security coverage
- 📊 **Priority levels** and implementation complexity
- 💡 **Code examples** for each vulnerability pattern

**Target Audience**: Developers building LLM-powered applications, AI agents, and agentic systems.

---

## OWASP LLM Top 10 (2025) Overview

| ID        | Vulnerability                    | Description                                              |
| --------- | -------------------------------- | -------------------------------------------------------- |
| **LLM01** | Prompt Injection                 | Manipulating LLM behavior via malicious input            |
| **LLM02** | Sensitive Information Disclosure | Unintentional exposure of private/proprietary data       |
| **LLM03** | Supply Chain Vulnerabilities     | Risks in training datasets, models, deployment platforms |
| **LLM04** | Data and Model Poisoning         | Malicious manipulation of datasets/fine-tuning           |
| **LLM05** | Improper Output Handling         | Insufficient validation of LLM outputs                   |
| **LLM06** | Excessive Agency                 | Granting LLMs too much autonomy/permissions              |
| **LLM07** | System Prompt Leakage            | Unintentional exposure of system prompts                 |
| **LLM08** | Vector and Embedding Weaknesses  | Vulnerabilities in vector databases/embeddings           |
| **LLM09** | Misinformation                   | Generating/propagating incorrect information             |
| **LLM10** | Unbounded Consumption            | Excessive resource consumption/DoS                       |

---

## LLM01: Prompt Injection

> **Risk**: Attackers manipulate LLM behavior by injecting malicious input that bypasses safeguards

### Existing Rules ✅

| Rule                        | Status    | Coverage                                                           |
| --------------------------- | --------- | ------------------------------------------------------------------ |
| `no-unvalidated-user-input` | ✅ Exists | Partial - detects missing validation but not LLM-specific patterns |
| `no-improper-sanitization`  | ✅ Exists | Partial - general sanitization, not prompt-specific                |

### New Rules Needed 🆕

#### 🔴 Critical Priority

| Rule ID                                    | Rule Name                                      | Description                                                                      | CWE    |
| ------------------------------------------ | ---------------------------------------------- | -------------------------------------------------------------------------------- | ------ |
| `no-unsafe-prompt-concatenation`           | Prevent unsafe prompt string concatenation     | Detects direct concatenation of user input into LLM prompts without sanitization | CWE-74 |
| `require-prompt-template-parameterization` | Enforce parameterized prompts                  | Requires use of structured templates instead of string interpolation             | CWE-20 |
| `no-dynamic-system-prompts`                | Prevent runtime modification of system prompts | Flags system prompts that can be altered without validation                      | CWE-94 |
| `detect-indirect-prompt-injection-vectors` | Detect potential indirect injection sources    | Identifies code where external content (emails, docs, web pages) reaches LLM     | CWE-74 |

#### Implementation Example: `no-unsafe-prompt-concatenation`

```typescript
// ❌ BAD - Direct concatenation
const prompt = 'Summarize this: ' + userInput;
await llm.complete(prompt);

// ❌ BAD - Template literal without sanitization
const prompt = `
  You are a helpful assistant.
  User query: ${externalData}
`;
await openai.chat.completions.create({
  messages: [{ role: 'user', content: prompt }],
});

// ❌ BAD - Array.join without validation
const messages = [systemPrompt, userInput].join('\n');

// ✅ GOOD - Parameterized prompt with structure
const messages = [
  { role: 'system', content: 'You are a helpful assistant' },
  { role: 'user', content: validateAndSanitize(userInput) },
];

// ✅ GOOD - Using prompt template library
import { PromptTemplate } from 'langchain/prompts';
const template = PromptTemplate.fromTemplate('Summarize: {input}');
const prompt = await template.format({ input: sanitize(userInput) });

// ✅ GOOD - Explicit sanitization function
const safePrompt = promptGuard.sanitize(userInput);
await llm.complete(safePrompt);
```

#### 🟠 High Priority

| Rule ID                                  | Rule Name                                    | Description                                                   | CWE    |
| ---------------------------------------- | -------------------------------------------- | ------------------------------------------------------------- | ------ |
| `require-input-sanitization-for-llm`     | Require sanitization before LLM calls        | Enforces sanitization functions on all inputs to LLM APIs     | CWE-20 |
| `detect-rag-injection-risks`             | Detect RAG content injection vulnerabilities | Flags RAG/document inputs that reach LLM without CDR/scanning | CWE-74 |
| `no-user-controlled-prompt-instructions` | Prevent user-controlled instructions         | Flags cases where user input directly controls LLM behavior   | CWE-73 |

---

## LLM02: Sensitive Information Disclosure

> **Risk**: LLMs unintentionally reveal PII, credentials, or confidential business data

### Existing Rules ✅

| Rule                         | Status    | Coverage                                |
| ---------------------------- | --------- | --------------------------------------- |
| `no-exposed-sensitive-data`  | ✅ Exists | Detects logging/exposing sensitive data |
| `no-sensitive-data-exposure` | ✅ Exists | Flags sensitive data in responses       |
| `no-hardcoded-credentials`   | ✅ Exists | Detects hardcoded API keys, passwords   |

### New Rules Needed 🆕

#### 🔴 Critical Priority

| Rule ID                                    | Rule Name                                          | Description                                                       | CWE     |
| ------------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------------- | ------- |
| `no-pii-in-llm-training-data`              | Prevent PII in training datasets                   | Detects potential PII exposure in data passed to fine-tuning APIs | CWE-359 |
| `require-llm-output-redaction`             | Require redaction of sensitive data in LLM outputs | Enforces redaction/filtering of LLM responses before display      | CWE-200 |
| `no-credentials-in-llm-context`            | Prevent credentials in LLM context                 | Flags API keys, tokens being passed to LLM context/memory         | CWE-522 |
| `detect-overly-permissive-llm-data-access` | Detect excessive data access by LLMs               | Identifies LLM tools with access to entire databases/filesystems  | CWE-732 |

#### Implementation Example: `no-credentials-in-llm-context`

```typescript
// ❌ BAD - API key in prompt
const prompt = `Use this API key to access the service: ${process.env.API_KEY}`;
await llm.complete(prompt);

// ❌ BAD - Passing credentials in context
const context = {
  database: {
    host: 'db.company.com',
    user: 'admin',
    password: dbPassword, // Exposed to LLM memory
  },
};
await agent.run('Query the database', { context });

// ❌ BAD - Connection string in RAG document
const doc = `Database: postgresql://user:password@host:5432/db`;
await vectorStore.addDocuments([doc]);

// ✅ GOOD - Credentials isolated from LLM context
const dbClient = createSecureClient(process.env.DB_CONN_STRING);
const results = await dbClient.query(userQuery);
// Only results passed to LLM, not credentials

// ✅ GOOD - Using credential vault references
const context = {
  database: {
    credentialRef: 'vault://secrets/db-creds', // Reference, not actual value
  },
};

// ✅ GOOD - Redacting sensitive data before LLM
const safeContext = redactCredentials(rawContext);
await llm.complete(prompt, { context: safeContext });
```

#### 🟠 High Priority

| Rule ID                               | Rule Name                                | Description                                                 | CWE     |
| ------------------------------------- | ---------------------------------------- | ----------------------------------------------------------- | ------- |
| `require-data-minimization-for-llm`   | Enforce data minimization principle      | Requires limiting data passed to LLM to minimum necessary   | CWE-213 |
| `no-verbose-llm-error-messages`       | Prevent verbose error messages           | Flags detailed error messages that might expose system info | CWE-209 |
| `require-llm-conversation-encryption` | Require encryption for LLM conversations | Enforces encryption at rest for chat history/memory         | CWE-311 |

---

## LLM03: Supply Chain Vulnerabilities

> **Risk**: Compromised training data, pre-trained models, or deployment platforms

### Existing Rules ✅

| Rule                       | Status     | Coverage                                        |
| -------------------------- | ---------- | ----------------------------------------------- |
| (None directly applicable) | ❌ Missing | No existing rules for LLM-specific supply chain |

### New Rules Needed 🆕

#### 🔴 Critical Priority

| Rule ID                                     | Rule Name                                    | Description                                                         | CWE     |
| ------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------- | ------- |
| `require-model-provenance-verification`     | Require model source verification            | Enforces verification of model origins (Hugging Face, OpenAI, etc.) | CWE-494 |
| `no-unverified-model-downloads`             | Prevent downloading unverified models        | Flags dynamic model loading without signature/hash verification     | CWE-494 |
| `require-training-data-validation`          | Require validation of training datasets      | Enforces scanning/validation of datasets before fine-tuning         | CWE-20  |
| `detect-model-serving-infrastructure-risks` | Detect insecure model serving configurations | Identifies unsafe model deployment (no auth, public endpoints)      | CWE-306 |

#### Implementation Example: `require-model-provenance-verification`

```typescript
// ❌ BAD - Loading model from untrusted source
import { AutoModelForCausalLM } from '@huggingface/transformers';
const model = await AutoModelForCausalLM.from_pretrained(
  'random-user/suspicious-model',
);

// ❌ BAD - Downloading model without verification
const modelUrl = userProvidedUrl; // User-controlled!
const model = await downloadModel(modelUrl);

// ❌ BAD - No checksum verification
fetch('https://example.com/model.bin')
  .then((r) => r.blob())
  .then((blob) => loadModel(blob));

// ✅ GOOD - Verified model from trusted registry
const model = await AutoModelForCausalLM.from_pretrained(
  'openai-community/gpt2',
  {
    revision: '607a30d783dfa663caf39e06633721c8d4cfcd7e', // Pinned commit
    cache_dir: './verified-models',
  },
);

// ✅ GOOD - Checksum verification
const modelPath = await downloadModel(
  'https://trusted-registry.com/model.bin',
  {
    expectedHash: 'sha256:abc123...',
    verifySignature: true,
    trustedPublicKey: process.env.MODEL_REGISTRY_PUBLIC_KEY,
  },
);

// ✅ GOOD - SBOM/AIBOM tracking
import { AIBillOfMaterials } from '@owasp/aibom';
const aibom = new AIBillOfMaterials();
aibom.addModel({
  name: 'gpt-3.5-turbo',
  version: '0613',
  provider: 'OpenAI',
  verificationMethod: 'API_KEY_AUTH',
  licensingInfo: 'Commercial',
});
```

#### 🟠 High Priority

| Rule ID                               | Rule Name                           | Description                                          | CWE     |
| ------------------------------------- | ----------------------------------- | ---------------------------------------------------- | ------- |
| `require-llm-plugin-sandboxing`       | Require sandboxing for LLM plugins  | Enforces isolation of third-party LLM plugins        | CWE-653 |
| `detect-plugin-permission-over-grant` | Detect excessive plugin permissions | Identifies plugins with more permissions than needed | CWE-250 |
| `require-model-version-pinning`       | Require pinned model versions       | Prevents use of `latest` tags for models             | CWE-829 |

---

## LLM04: Data and Model Poisoning

> **Risk**: Malicious manipulation of training datasets or fine-tuning processes

### Existing Rules ✅

| Rule                       | Status     | Coverage                                  |
| -------------------------- | ---------- | ----------------------------------------- |
| (None directly applicable) | ❌ Missing | No existing rules for poisoning detection |

### New Rules Needed 🆕

#### 🔴 Critical Priority

| Rule ID                                     | Rule Name                                 | Description                                               | CWE     |
| ------------------------------------------- | ----------------------------------------- | --------------------------------------------------------- | ------- |
| `require-training-data-provenance`          | Require source tracking for training data | Enforces metadata tracking for all training datasets      | CWE-346 |
| `detect-user-supplied-training-data`        | Detect unsanitized user data in training  | Flags user-generated content being added to training sets | CWE-20  |
| `no-auto-model-retraining-on-user-feedback` | Prevent automatic retraining              | Requires human review before model updates                | CWE-754 |
| `require-training-data-integrity-checks`    | Require checksums for training data       | Enforces hash verification of datasets                    | CWE-354 |

#### Implementation Example: `detect-user-supplied-training-data`

```typescript
// ❌ BAD - User feedback directly added to training data
async function collectFeedback(userResponse: string) {
  await trainingDatabase.insert({
    prompt: currentPrompt,
    response: userResponse, // Unsanitized!
    timestamp: Date.now(),
  });

  // Auto-retrain on schedule
  if (shouldRetrain()) {
    await model.fineTune(trainingDatabase.getAll());
  }
}

// ❌ BAD - Web scraping without validation
const scrapedData = await scrapeWebsite(url);
await finetune.addData(scrapedData); // Could contain malicious content

// ❌ BAD - No integrity verification
const dataset = await fetch('https://example.com/training-data.json');
await model.fineTune(dataset); // No hash check

// ✅ GOOD - Multi-stage validation before training
async function collectFeedback(userResponse: string) {
  // Stage 1: Quarantine
  await quarantineDatabase.insert({
    prompt: currentPrompt,
    response: userResponse,
    status: 'pending_review',
    timestamp: Date.now(),
  });

  // Stage 2: Human review
  // Trigger manual review workflow
  await reviewQueue.add({
    data: userResponse,
    priority: 'medium',
  });
}

async function approveForTraining(dataId: string, reviewerId: string) {
  // Stage 3: Sanitization
  const data = await quarantineDatabase.get(dataId);
  const sanitized = await toxicityFilter.scan(data.response);

  if (sanitized.isSafe) {
    // Stage 4: Add to training with provenance
    await trainingDatabase.insert({
      ...data,
      sanitized: true,
      reviewedBy: reviewerId,
      provenance: 'user_feedback_reviewed',
    });
  }
}

// ✅ GOOD - Integrity checks
const dataset = await fetchDataset('https://trusted-source.com/data.json', {
  expectedHash: 'sha256:def456...',
  maxSize: 100 * 1024 * 1024, // 100MB limit
  allowedContentTypes: ['application/json'],
});

await model.fineTune(dataset, {
  validationSplit: 0.2,
  maxEpochs: 3,
  requireHumanApproval: true,
});
```

#### 🟡 Medium Priority

| Rule ID                                         | Rule Name                      | Description                                                 | CWE     |
| ----------------------------------------------- | ------------------------------ | ----------------------------------------------------------- | ------- |
| `require-adversarial-testing-before-deployment` | Require adversarial validation | Enforces testing against poisoning attacks                  | CWE-754 |
| `detect-data-drift-monitoring`                  | Require drift detection        | Ensures monitoring for unexpected data distribution changes | CWE-754 |

---

## LLM05: Improper Output Handling

> **Risk**: Insufficient validation of LLM outputs leading to XSS, SQL injection, RCE

### Existing Rules ✅

| Rule                          | Status    | Coverage                               |
| ----------------------------- | --------- | -------------------------------------- |
| `no-unsanitized-html`         | ✅ Exists | Detects innerHTML without sanitization |
| `no-sql-injection`            | ✅ Exists | Detects SQL injection vulnerabilities  |
| `detect-eval-with-expression` | ✅ Exists | Detects dangerous eval usage           |
| `detect-child-process`        | ✅ Exists | Flags unsafe child_process usage       |

### New Rules Needed 🆕

#### 🔴 Critical Priority

| Rule ID                          | Rule Name                              | Description                                                 | CWE     |
| -------------------------------- | -------------------------------------- | ----------------------------------------------------------- | ------- |
| `require-llm-output-validation`  | Enforce validation of all LLM outputs  | Requires explicit validation before using LLM responses     | CWE-20  |
| `no-direct-llm-output-execution` | Prevent direct execution of LLM output | Flags eval(), exec(), child_process with LLM-generated code | CWE-94  |
| `require-llm-output-encoding`    | Require context-appropriate encoding   | Enforces HTML/SQL/shell encoding based on usage context     | CWE-116 |
| `detect-llm-generated-sql`       | Detect SQL queries from LLM outputs    | Identifies potentially dangerous LLM-to-SQL patterns        | CWE-89  |

#### Implementation Example: `no-direct-llm-output-execution`

```typescript
// ❌ BAD - Directly executing LLM-generated code
const code = await llm.complete('Generate a function that...');
eval(code); // DANGEROUS!

// ❌ BAD - Shell command from LLM
const command = await llm.complete('What command should I run to...?');
exec(command); // DANGEROUS!

// ❌ BAD - SQL query from LLM
const query = await llm.complete('Generate SQL to find...');
await db.query(query); // SQL INJECTION RISK!

// ❌ BAD - HTML rendering without sanitization
const html = await llm.complete('Generate HTML for...');
document.getElementById('content').innerHTML = html; // XSS RISK!

// ✅ GOOD - Sandboxed execution with validation
const code = await llm.complete('Generate a function that...');

// Step 1: Validate syntax
const ast = parseToAST(code);
if (!isValidAST(ast)) {
  throw new Error('Invalid code structure');
}

// Step 2: Static analysis
const risks = await analyzeCode(code);
if (risks.length > 0) {
  throw new Error('Security risks detected');
}

// Step 3: Sandboxed execution
const result = await runInSandbox(code, {
  timeout: 5000,
  memory: '128MB',
  allowedAPIs: ['Math', 'String', 'Array'],
  networkAccess: false,
});

// ✅ GOOD - Structured output validation
import { z } from 'zod';

const QuerySchema = z.object({
  action: z.enum(['select', 'count']),
  table: z.enum(['users', 'orders']),
  filters: z.array(
    z.object({
      field: z.string(),
      operator: z.enum(['=', '>', '<']),
      value: z.string(),
    }),
  ),
});

const llmResponse = await llm.complete('How do I query...?', {
  responseFormat: { type: 'json_object' },
});

const parsed = QuerySchema.parse(JSON.parse(llmResponse));
const query = queryBuilder.build(parsed); // Safe parameterized query

// ✅ GOOD - HTML sanitization
import DOMPurify from 'isomorphic-dompurify';

const html = await llm.complete('Generate HTML for...');
const sanitized = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
  ALLOWED_ATTR: [],
});
document.getElementById('content').innerHTML = sanitized;
```

#### 🟠 High Priority

| Rule ID                                | Rule Name                                        | Description                                                            | CWE    |
| -------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------- | ------ |
| `require-structured-llm-outputs`       | Enforce structured output formats                | Requires LLM to output JSON/XML instead of freeform text when possible | CWE-20 |
| `detect-llm-output-in-dangerous-sinks` | Detect LLM output in dangerous contexts          | Flags LLM responses used in system(), innerHTML, etc.                  | CWE-94 |
| `require-llm-output-schema-validation` | Require schema validation for structured outputs | Enforces JSON schema validation on LLM responses                       | CWE-20 |

---

## LLM06: Excessive Agency

> **Risk**: Granting LLMs excessive autonomy, permissions, or tool access

### Existing Rules ✅

| Rule                            | Status     | Coverage                                  |
| ------------------------------- | ---------- | ----------------------------------------- |
| `no-privilege-escalation`       | ✅ Exists  | Detects improper authorization checks     |
| (Related but not comprehensive) | ⚠️ Partial | General privilege rules, not LLM-specific |

### New Rules Needed 🆕

#### 🔴 Critical Priority

| Rule ID                                       | Rule Name                                         | Description                                                | CWE     |
| --------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------- | ------- |
| `enforce-llm-tool-least-privilege`            | Require least privilege for LLM tools             | Ensures tools have minimal necessary permissions           | CWE-250 |
| `require-human-approval-for-critical-actions` | Enforce human-in-the-loop for critical operations | Requires confirmation before destructive/financial actions | CWE-284 |
| `no-auto-approved-llm-tools`                  | Prevent auto-execution without validation         | Flags tools that auto-execute without policy checks        | CWE-862 |
| `detect-llm-unrestricted-tool-access`         | Detect overly permissive tool configurations      | Identifies LLM agents with access to all tools             | CWE-732 |

#### Implementation Example: `require-human-approval-for-critical-actions`

```typescript
// ❌ BAD - Auto-executing financial transfer
const transferTool = {
  name: 'transfer_funds',
  description: 'Transfer money between accounts',
  execute: async (from: string, to: string, amount: number) => {
    // No approval step!
    return await bankAPI.transfer(from, to, amount);
  },
};

agent.registerTool(transferTool);

// ❌ BAD - Auto-deleting without confirmation
const deleteTool = {
  name: 'delete_database',
  description: 'Delete a database',
  execute: async (dbName: string) => {
    await db.drop(dbName); // DANGEROUS!
  },
};

// ❌ BAD - Unrestricted file system access
const fileTool = {
  name: 'file_operations',
  execute: async (operation: string, path: string) => {
    if (operation === 'delete') {
      fs.unlinkSync(path); // Can delete anything!
    }
  },
};

// ✅ GOOD - Human approval required
const transferTool = {
  name: 'transfer_funds',
  description: 'Transfer money between accounts',
  requiresApproval: true,
  riskLevel: 'critical',
  execute: async (
    from: string,
    to: string,
    amount: number,
    context: Context,
  ) => {
    // Step 1: Present to human
    const approval = await context.requestApproval({
      action: 'transfer_funds',
      details: { from, to, amount },
      risk: 'high',
      timeout: 300000, // 5 minutes
    });

    if (!approval.granted) {
      throw new Error('Transfer denied by human operator');
    }

    // Step 2: Log with approval ID
    logger.info('Transfer approved', {
      approvalId: approval.id,
      approver: approval.userId,
      ...{ from, to, amount },
    });

    // Step 3: Execute
    return await bankAPI.transfer(from, to, amount);
  },
};

// ✅ GOOD - Scoped file access with permissions
const fileTool = {
  name: 'file_operations',
  permissions: {
    read: ['/data/public/*'],
    write: ['/data/uploads/*'],
    delete: [], // No delete permission
  },
  execute: async (operation: string, path: string) => {
    // Validate path is within allowed scope
    if (!isPathAllowed(path, fileTool.permissions[operation])) {
      throw new Error(`Operation ${operation} not allowed on ${path}`);
    }

    if (operation === 'read') {
      return fs.readFileSync(path, 'utf-8');
    } else if (operation === 'write') {
      // Write operations still require validation
      return fs.writeFileSync(path, content);
    }
  },
};

// ✅ GOOD - Rate limiting and monitoring
const emailTool = {
  name: 'send_email',
  rateLimit: {
    maxCalls: 10,
    window: '1h',
  },
  execute: async (to: string, subject: string, body: string) => {
    // Check rate limit
    if (await rateLimiter.isExceeded('send_email')) {
      throw new Error('Rate limit exceeded');
    }

    // Validate recipients are internal
    if (!to.endsWith('@company.com')) {
      throw new Error('Can only send to internal emails');
    }

    await emailService.send(to, subject, body);
  },
};
```

#### 🟠 High Priority

| Rule ID                                  | Rule Name                                | Description                                        | CWE     |
| ---------------------------------------- | ---------------------------------------- | -------------------------------------------------- | ------- |
| `require-llm-tool-permission-boundaries` | Enforce permission boundaries for tools  | Requires IAM-style policies for each tool          | CWE-250 |
| `detect-llm-agent-privilege-creep`       | Detect privilege escalation over time    | Monitors for gradual increase in agent permissions | CWE-269 |
| `require-llm-tool-rate-limiting`         | Enforce rate limits on tool usage        | Requires rate limiting configuration               | CWE-770 |
| `no-llm-tools-without-audit`             | Require audit logging for all tool calls | Ensures all tool invocations are logged            | CWE-778 |

---

## LLM07: System Prompt Leakage

> **Risk**: Unintentional exposure of system prompts containing instructions/configurations

### Existing Rules ✅

| Rule                       | Status     | Coverage                             |
| -------------------------- | ---------- | ------------------------------------ |
| (None directly applicable) | ❌ Missing | No existing rules for prompt leakage |

### New Rules Needed 🆕

#### 🔴 Critical Priority

| Rule ID                                    | Rule Name                           | Description                                               | CWE     |
| ------------------------------------------ | ----------------------------------- | --------------------------------------------------------- | ------- |
| `no-system-prompt-in-output`               | Prevent system prompts in responses | Detects code that might echo system prompts to users      | CWE-200 |
| `require-system-prompt-isolation`          | Enforce isolation of system prompts | Ensures system prompts are not accessible via LLM queries | CWE-552 |
| `detect-prompt-extraction-vulnerabilities` | Detect prompt extraction risks      | Identifies patterns that might reveal system instructions | CWE-200 |

#### Implementation Example: `no-system-prompt-in-output`

```typescript
// ❌ BAD - System prompt accessible in conversation history
const messages = [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: userQuery },
  { role: 'assistant', content: response }
];

// Return full conversation (includes system prompt!)
return res.json({ messages });

// ❌ BAD - System prompt in debug mode
if (req.query.debug) {
  return res.json({
    systemPrompt: systemPrompt, // LEAKED!
    response: response
  });
}

// ❌ BAD - System prompt in error messages
try {
  await llm.complete(...);
} catch (error) {
  throw new Error(`Failed with system prompt: ${systemPrompt}\n${error}`);
}

// ✅ GOOD - System prompt never exposed to client
const messages = [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: userQuery }
];

const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages
});

// Only return assistant's response
return res.json({
  response: completion.choices[0].message.content
  // System prompt intentionally excluded
});

// ✅ GOOD - Separate system prompts by environment
const systemPrompt = getSystemPrompt({
  environment: process.env.NODE_ENV,
  includeDebugInfo: false // Never include in production
});

// ✅ GOOD - Prompt leakage detection filter
const response = await llm.complete(userQuery);

// Filter out any leaked system instructions
const sanitizedResponse = removeSystemPromptLeakage(response, {
  systemPromptKeywords: ['You are a helpful assistant', 'Your role is'],
  redactMatches: true
});

return sanitizedResponse;

// ✅ GOOD - Using prompt caching without exposure
const systemPromptHash = hashPrompt(systemPrompt);
const cachedResponse = await cache.get(systemPromptHash + userQuery);

if (cachedResponse) {
  return cachedResponse; // Hash prevents reverse engineering
}
```

#### 🟠 High Priority

| Rule ID                               | Rule Name                                    | Description                                                     | CWE     |
| ------------------------------------- | -------------------------------------------- | --------------------------------------------------------------- | ------- |
| `require-system-prompt-encryption`    | Require encryption of system prompts at rest | Enforces encryption for stored prompts                          | CWE-311 |
| `no-system-prompt-in-logs`            | Prevent system prompts in application logs   | Flags logging that might include system prompts                 | CWE-532 |
| `detect-instruction-hierarchy-bypass` | Detect attempts to bypass prompt hierarchy   | Identifies patterns that might reveal higher-level instructions | CWE-284 |

---

## LLM08: Vector and Embedding Weaknesses

> **Risk**: Improper access or manipulation of vector databases/embeddings

### Existing Rules ✅

| Rule                       | Status     | Coverage                                       |
| -------------------------- | ---------- | ---------------------------------------------- |
| (None directly applicable) | ❌ Missing | No existing rules for vector database security |

### New Rules Needed 🆕

#### 🔴 Critical Priority

| Rule ID                              | Rule Name                                   | Description                                                       | CWE     |
| ------------------------------------ | ------------------------------------------- | ----------------------------------------------------------------- | ------- |
| `require-vector-db-access-control`   | Enforce access controls on vector databases | Requires authentication/authorization for vector DB operations    | CWE-862 |
| `detect-embedding-poisoning-risks`   | Detect potential embedding manipulation     | Identifies code that allows untrusted embedding inputs            | CWE-20  |
| `require-vector-namespace-isolation` | Enforce namespace isolation in vector DBs   | Requires multi-tenant separation in vector stores                 | CWE-668 |
| `no-unvalidated-embeddings`          | Prevent use of unvalidated embeddings       | Requires validation of embedding vectors before storage/retrieval | CWE-20  |

#### Implementation Example: `require-vector-namespace-isolation`

```typescript
// ❌ BAD - No namespace isolation (cross-tenant leakage risk)
const vectorStore = new PineconeStore({
  apiKey: process.env.PINECONE_API_KEY,
  indexName: 'shared-embeddings', // All tenants share one index!
});

await vectorStore.addDocuments([
  { text: companyAData, metadata: { tenant: 'companyA' } },
  { text: companyBData, metadata: { tenant: 'companyB' } },
]);

// Query might leak cross-tenant data
const results = await vectorStore.similaritySearch(query, 5);

// ❌ BAD - No filtering on tenant
async function search(userQuery: string) {
  return await vectorStore.similaritySearch(userQuery);
  // Could return any tenant's data!
}

// ❌ BAD - Metadata-only separation (easily bypassed)
const results = await vectorStore.similaritySearch(query, 10, {
  filter: { tenant: currentTenant }, // Filter AFTER retrieval
});

// ✅ GOOD - Namespace-level isolation
const vectorStore = new PineconeStore({
  apiKey: process.env.PINECONE_API_KEY,
  indexName: 'embeddings',
  namespace: `tenant-${tenantId}`, // Separate namespace per tenant
});

// Each tenant has physically isolated vectors
await vectorStore.addDocuments(documents);

// ✅ GOOD - Index-per-tenant for critical applications
const vectorStore = new PineconeStore({
  apiKey: process.env.PINECONE_API_KEY,
  indexName: `embeddings-tenant-${tenantId}`, // Dedicated index
  environment: 'us-west1-gcp',
});

// ✅ GOOD - Enforced access control
class SecureVectorStore {
  constructor(
    private tenantId: string,
    private userId: string,
    private store: VectorStore,
  ) {}

  async addDocuments(docs: Document[]) {
    // Validate tenant permissions
    if (!(await this.hasWriteAccess(this.tenantId, this.userId))) {
      throw new Error('Unauthorized');
    }

    // Add tenant metadata automatically
    const taggedDocs = docs.map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        tenant: this.tenantId,
        uploadedBy: this.userId,
        timestamp: Date.now(),
      },
    }));

    return await this.store.addDocuments(taggedDocs);
  }

  async similaritySearch(query: string, k: number = 5) {
    // Enforce namespace
    const results = await this.store.similaritySearch(query, k, {
      namespace: `tenant-${this.tenantId}`,
      filter: { tenant: this.tenantId }, // Defense in depth
    });

    // Audit log
    await auditLog.record({
      action: 'vector_search',
      userId: this.userId,
      tenantId: this.tenantId,
      query: hashQuery(query),
      resultCount: results.length,
    });

    return results;
  }
}

// ✅ GOOD - Embedding validation
async function addEmbedding(vector: number[], metadata: any) {
  // Validate vector dimensions
  if (vector.length !== EXPECTED_DIMENSIONS) {
    throw new Error('Invalid embedding dimensions');
  }

  // Check for anomalous values
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude < MIN_MAGNITUDE || magnitude > MAX_MAGNITUDE) {
    throw new Error('Embedding magnitude out of expected range');
  }

  // Check for NaN or Infinity
  if (vector.some((val) => !Number.isFinite(val))) {
    throw new Error('Invalid embedding values');
  }

  await vectorStore.add(vector, metadata);
}
```

#### 🟠 High Priority

| Rule ID                              | Rule Name                                        | Description                                         | CWE     |
| ------------------------------------ | ------------------------------------------------ | --------------------------------------------------- | ------- |
| `detect-vector-db-injection`         | Detect vector database injection vulnerabilities | Identifies unsafe query construction for vector DBs | CWE-943 |
| `require-embedding-integrity-checks` | Require checksums for embeddings                 | Enforces validation of embedding integrity          | CWE-354 |
| `no-public-vector-db-exposure`       | Prevent public exposure of vector databases      | Flags vector DBs without authentication             | CWE-306 |

---

## LLM09: Misinformation

> **Risk**: LLMs generating/propagating incorrect or misleading information

### Existing Rules ✅

| Rule                       | Status     | Coverage                                       |
| -------------------------- | ---------- | ---------------------------------------------- |
| (None directly applicable) | ❌ Missing | No existing rules for misinformation detection |

### New Rules Needed 🆕

#### 🔴 Critical Priority

| Rule ID                               | Rule Name                                      | Description                                               | CWE     |
| ------------------------------------- | ---------------------------------------------- | --------------------------------------------------------- | ------- |
| `require-llm-fact-checking`           | Enforce fact-checking for critical outputs     | Requires verification step for important information      | CWE-345 |
| `require-llm-confidence-scores`       | Enforce confidence scoring                     | Requires LLM to provide confidence metrics with responses | CWE-345 |
| `no-uncited-llm-facts`                | Prevent uncited factual claims                 | Requires source attribution for factual statements        | CWE-345 |
| `detect-hallucination-prone-contexts` | Detect contexts likely to cause hallucinations | Identifies queries that might produce unreliable outputs  | CWE-754 |

#### Implementation Example: `require-llm-fact-checking`

```typescript
// ❌ BAD - No fact verification
async function answerQuestion(question: string) {
  const answer = await llm.complete(question);
  return answer; // Could be completely made up!
}

// ❌ BAD - Medical/legal advice without verification
const medicalAdvice = await llm.complete('What should I do about...');
return res.json({ advice: medicalAdvice }); // DANGEROUS!

// ❌ BAD - News/facts without source verification
const news = await llm.complete('What happened in...');
await publishArticle(news); // Could be false

// ✅ GOOD - Multi-step fact verification
async function answerFactualQuestion(question: string) {
  // Step 1: Get LLM response
  const answer = await llm.complete(question, {
    responseFormat: {
      type: 'json_object',
      schema: {
        answer: 'string',
        confidence: 'number',
        sources: 'array',
      },
    },
  });

  const parsed = JSON.parse(answer);

  // Step 2: Verify against knowledge base
  const verification = await knowledgeBase.verify(parsed.answer);

  // Step 3: Cross-reference with authoritative sources
  const crossCheck = await factCheckAPI.verify({
    claim: parsed.answer,
    domain: extractDomain(question),
  });

  // Step 4: Return with verification metadata
  return {
    answer: parsed.answer,
    confidence: parsed.confidence,
    verified: verification.isAccurate && crossCheck.factual,
    sources: [...parsed.sources, ...verification.sources],
    warnings: parsed.confidence < 0.7 ? ['Low confidence'] : [],
  };
}

// ✅ GOOD - RAG with source attribution
async function answerWithSources(question: string) {
  // Retrieve relevant documents
  const docs = await vectorStore.similaritySearch(question, 5);

  // Generate answer with citations
  const prompt = `
    Answer the question based ONLY on the provided context.
    If the answer is not in the context, say "I don't know."
    
    Context:
    ${docs.map((doc, i) => `[${i + 1}] ${doc.pageContent}`).join('\n\n')}
    
    Question: ${question}
    
    Provide your answer with citations [1], [2], etc.
  `;

  const answer = await llm.complete(prompt);

  return {
    answer,
    sources: docs.map((doc, i) => ({
      id: i + 1,
      source: doc.metadata.source,
      url: doc.metadata.url,
    })),
  };
}

// ✅ GOOD - Confidence scoring with thresholds
async function generateWithConfidence(input: string) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: input }],
    logprobs: true,
    top_logprobs: 5,
  });

  const response = completion.choices[0].message.content;
  const logprobs = completion.choices[0].logprobs;

  // Calculate average token confidence
  const avgConfidence = calculateConfidence(logprobs);

  // Reject low-confidence responses
  if (avgConfidence < CONFIDENCE_THRESHOLD) {
    return {
      answer: null,
      error: 'Unable to provide a confident answer',
      confidence: avgConfidence,
      suggestion: 'Please rephrase or provide more context',
    };
  }

  return {
    answer: response,
    confidence: avgConfidence,
    metadata: {
      model: 'gpt-4',
      timestamp: Date.now(),
    },
  };
}

// ✅ GOOD - Hallucination detection
async function detectHallucination(question: string, answer: string) {
  // Method 1: Self-consistency check
  const alternateAnswers = await Promise.all([
    llm.complete(question),
    llm.complete(question),
    llm.complete(question),
  ]);

  const consistency = calculateConsistency(alternateAnswers);
  if (consistency < 0.8) {
    return { isLikelyHallucination: true, reason: 'Low self-consistency' };
  }

  // Method 2: Fact verification against knowledge graph
  const entities = extractEntities(answer);
  const verification = await knowledgeGraph.verifyRelationships(entities);

  if (!verification.allValid) {
    return {
      isLikelyHallucination: true,
      reason: 'Invalid entity relationships',
      invalid: verification.invalidRelationships,
    };
  }

  return { isLikelyHallucination: false };
}
```

#### 🟡 Medium Priority

| Rule ID                                | Rule Name                              | Description                                        | CWE     |
| -------------------------------------- | -------------------------------------- | -------------------------------------------------- | ------- |
| `require-llm-output-versioning`        | Require versioning of LLM outputs      | Ensures traceability of generated content          | CWE-778 |
| `detect-bias-in-llm-responses`         | Detect potential bias in outputs       | Flags responses that might contain bias            | CWE-345 |
| `require-human-review-for-publication` | Require human review before publishing | Enforces human oversight for public-facing content | CWE-754 |

---

## LLM10: Unbounded Consumption

> **Risk**: Excessive resource consumption leading to DoS or unexpected costs

### Existing Rules ✅

| Rule                               | Status     | Coverage                                 |
| ---------------------------------- | ---------- | ---------------------------------------- |
| `no-unlimited-resource-allocation` | ✅ Exists  | Detects missing resource limits          |
| (Related)                          | ⚠️ Partial | General resource rules, not LLM-specific |

### New Rules Needed 🆕

#### 🔴 Critical Priority

| Rule ID                     | Rule Name                             | Description                                          | CWE     |
| --------------------------- | ------------------------------------- | ---------------------------------------------------- | ------- |
| `require-llm-token-limits`  | Enforce token limits on LLM calls     | Requires max_tokens parameter on all LLM API calls   | CWE-770 |
| `require-llm-cost-budgets`  | Enforce cost budgets for LLM usage    | Requires spending limits and monitoring              | CWE-400 |
| `detect-llm-infinite-loops` | Detect potential infinite agent loops | Identifies recursive agent calls without termination | CWE-834 |
| `require-llm-rate-limiting` | Enforce rate limiting on LLM APIs     | Requires rate limiting configuration                 | CWE-770 |

#### Implementation Example: `require-llm-token-limits`

```typescript
// ❌ BAD - No token limits
async function generateText(prompt: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    // Missing max_tokens! Could generate unlimited output
  });
  return response.choices[0].message.content;
}

// ❌ BAD - User-controlled max tokens
async function generate(prompt: string, maxTokens: number) {
  // User could set maxTokens to 100000!
  const response = await llm.complete(prompt, { max_tokens: maxTokens });
  return response;
}

// ❌ BAD - No timeout on agent execution
async function runAgent(task: string) {
  let steps = 0;
  let result;

  while (!result) {
    // Infinite loop risk!
    result = await agent.step(task);
    steps++;
  }

  return result;
}

// ❌ BAD - No cost tracking
async function handleBatchRequests(prompts: string[]) {
  // Could process millions of prompts without budget check
  return await Promise.all(prompts.map((p) => llm.complete(p)));
}

// ✅ GOOD - Enforced token limits
async function generateText(prompt: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000, // Hard limit
    temperature: 0.7,
  });
  return response.choices[0].message.content;
}

// ✅ GOOD - Cost budget enforcement
class BudgetedLLMClient {
  private monthlySpent: number = 0;
  private readonly monthlyBudget: number;

  constructor(budgetUSD: number) {
    this.monthlyBudget = budgetUSD;
  }

  async complete(prompt: string, options: any = {}) {
    // Check budget before API call
    if (this.monthlySpent >= this.monthlyBudget) {
      throw new Error('Monthly LLM budget exceeded');
    }

    // Estimate cost
    const estimatedCost = this.estimateCost(prompt, options);
    if (this.monthlySpent + estimatedCost > this.monthlyBudget) {
      throw new Error('Request would exceed monthly budget');
    }

    // Make API call with enforced limits
    const response = await openai.chat.completions.create({
      model: options.model || 'gpt-3.5-turbo', // Default to cheaper model
      messages: [{ role: 'user', content: prompt }],
      max_tokens: Math.min(options.max_tokens || 500, 2000), // Cap at 2000
      timeout: 30000, // 30 second timeout
    });

    // Track actual cost
    const actualCost = this.calculateCost(response.usage);
    this.monthlySpent += actualCost;

    // Alert if approaching budget
    if (this.monthlySpent > this.monthlyBudget * 0.8) {
      await alerting.send('LLM budget at 80%');
    }

    return response.choices[0].message.content;
  }

  private estimateCost(prompt: string, options: any): number {
    const inputTokens = prompt.length / 4; // Rough estimate
    const outputTokens = options.max_tokens || 500;
    const model = options.model || 'gpt-3.5-turbo';

    return (
      (inputTokens * MODEL_COSTS[model].input +
        outputTokens * MODEL_COSTS[model].output) /
      1000
    );
  }
}

// ✅ GOOD - Agent with termination conditions
async function runAgent(task: string) {
  const maxSteps = 10;
  const maxTime = 60000; // 60 seconds
  const startTime = Date.now();

  let steps = 0;
  let result;

  while (!result && steps < maxSteps && Date.now() - startTime < maxTime) {
    try {
      result = await Promise.race([
        agent.step(task),
        timeout(5000), // 5 second timeout per step
      ]);
      steps++;
    } catch (error) {
      if (error.message === 'timeout') {
        throw new Error(`Agent step timed out at step ${steps}`);
      }
      throw error;
    }
  }

  if (!result) {
    throw new Error(`Agent failed to complete after ${steps} steps`);
  }

  return { result, steps, duration: Date.now() - startTime };
}

// ✅ GOOD - Rate limiting
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

const llmLimiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per user
  keyGenerator: (req) => req.user.id,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many LLM requests. Please try again later.',
    });
  },
});

app.post('/api/generate', llmLimiter, async (req, res) => {
  const result = await llm.complete(req.body.prompt);
  res.json({ result });
});

// ✅ GOOD - Batch processing with limits
async function handleBatchRequests(prompts: string[]) {
  const MAX_BATCH_SIZE = 50;
  const CONCURRENT_LIMIT = 5;

  if (prompts.length > MAX_BATCH_SIZE) {
    throw new Error(
      `Batch size ${prompts.length} exceeds limit of ${MAX_BATCH_SIZE}`,
    );
  }

  // Process in small concurrent batches
  const results = [];
  for (let i = 0; i < prompts.length; i += CONCURRENT_LIMIT) {
    const batch = prompts.slice(i, i + CONCURRENT_LIMIT);
    const batchResults = await Promise.all(
      batch.map((p) => budgetedClient.complete(p)),
    );
    results.push(...batchResults);
  }

  return results;
}
```

#### 🟠 High Priority

| Rule ID                             | Rule Name                        | Description                                            | CWE     |
| ----------------------------------- | -------------------------------- | ------------------------------------------------------ | ------- |
| `require-llm-timeout-configuration` | Enforce timeout settings         | Requires timeout configuration for LLM API calls       | CWE-400 |
| `detect-llm-retry-storms`           | Detect excessive retry attempts  | Identifies retry logic that might cause request storms | CWE-400 |
| `require-llm-usage-monitoring`      | Require usage metrics collection | Enforces monitoring of LLM API usage                   | CWE-778 |

---

## Summary: Coverage Analysis

### Existing Coverage

| OWASP LLM ID | Existing Rules | Coverage % | Gap Priority |
| ------------ | -------------- | ---------- | ------------ |
| LLM01        | 2 rules        | 20%        | 🔴 Critical  |
| LLM02        | 3 rules        | 40%        | 🔴 Critical  |
| LLM03        | 0 rules        | 0%         | 🔴 Critical  |
| LLM04        | 0 rules        | 0%         | 🔴 Critical  |
| LLM05        | 4 rules        | 50%        | 🟠 High      |
| LLM06        | 1 rule         | 15%        | 🔴 Critical  |
| LLM07        | 0 rules        | 0%         | 🟠 High      |
| LLM08        | 0 rules        | 0%         | 🟠 High      |
| LLM09        | 0 rules        | 0%         | 🟡 Medium    |
| LLM10        | 1 rule         | 20%        | 🟠 High      |

**Overall Coverage**: ~15% of OWASP LLM Top 10 vulnerabilities

### New Rules Summary

| Priority    | Count    | Categories                                      |
| ----------- | -------- | ----------------------------------------------- |
| 🔴 Critical | 32 rules | LLM01, LLM02, LLM03, LLM04, LLM06, LLM08        |
| 🟠 High     | 18 rules | LLM01, LLM02, LLM05, LLM06, LLM07, LLM08, LLM10 |
| 🟡 Medium   | 3 rules  | LLM04, LLM09                                    |

**Total New Rules**: 53 rules across all OWASP LLM categories

---

## Implementation Roadmap

### Phase 1: Critical Security Gaps (Q1 2026)

**Focus**: Prevent immediate exploits and data leakage

1. **LLM01: Prompt Injection** (4 rules, 3 weeks)
   - `no-unsafe-prompt-concatenation`
   - `require-prompt-template-parameterization`
   - `no-dynamic-system-prompts`
   - `detect-indirect-prompt-injection-vectors`

2. **LLM02: Information Disclosure** (4 rules, 2 weeks)
   - `no-pii-in-llm-training-data`
   - `require-llm-output-redaction`
   - `no-credentials-in-llm-context`
   - `detect-overly-permissive-llm-data-access`

3. **LLM06: Excessive Agency** (4 rules, 3 weeks)
   - `enforce-llm-tool-least-privilege`
   - `require-human-approval-for-critical-actions`
   - `no-auto-approved-llm-tools`
   - `detect-llm-unrestricted-tool-access`

**Phase 1 Total**: 12 rules, ~8 weeks

### Phase 2: Supply Chain & Output Security (Q2 2026)

**Focus**: Secure model lifecycle and output handling

4. **LLM03: Supply Chain** (4 rules, 4 weeks)
   - `require-model-provenance-verification`
   - `no-unverified-model-downloads`
   - `require-training-data-validation`
   - `detect-model-serving-infrastructure-risks`

5. **LLM04: Data Poisoning** (4 rules, 3 weeks)
   - `require-training-data-provenance`
   - `detect-user-supplied-training-data`
   - `no-auto-model-retraining-on-user-feedback`
   - `require-training-data-integrity-checks`

6. **LLM05: Output Handling** (4 rules, 3 weeks)
   - `require-llm-output-validation`
   - `no-direct-llm-output-execution`
   - `require-llm-output-encoding`
   - `detect-llm-generated-sql`

**Phase 2 Total**: 12 rules, ~10 weeks

### Phase 3: Advanced Protections (Q3 2026)

**Focus**: Vector security and resource management

7. **LLM08: Vector Security** (4 rules, 4 weeks)
   - `require-vector-db-access-control`
   - `detect-embedding-poisoning-risks`
   - `require-vector-namespace-isolation`
   - `no-unvalidated-embeddings`

8. **LLM10: Resource Limits** (4 rules, 2 weeks)
   - `require-llm-token-limits`
   - `require-llm-cost-budgets`
   - `detect-llm-infinite-loops`
   - `require-llm-rate-limiting`

9. **LLM07: Prompt Leakage** (3 rules, 2 weeks)
   - `no-system-prompt-in-output`
   - `require-system-prompt-isolation`
   - `detect-prompt-extraction-vulnerabilities`

**Phase 3 Total**: 11 rules, ~8 weeks

### Phase 4: Quality & Trust (Q4 2026)

**Focus**: Misinformation prevention and additional safeguards

10. **LLM09: Misinformation** (4 rules, 3 weeks)
    - `require-llm-fact-checking`
    - `require-llm-confidence-scores`
    - `no-uncited-llm-facts`
    - `detect-hallucination-prone-contexts`

11. **High-Priority Enhancements** (Selected rules, 5 weeks)

**Phase 4 Total**: ~8 weeks

---

## Testing & Validation Strategy

### Unit Testing

Each rule requires:

- ✅ **Valid code examples** (should not trigger)
- ❌ **Invalid code examples** (should trigger)
- 🔄 **Edge cases** (framework-specific patterns)
- 📊 **Performance benchmarks** (< 100ms per file)

### Framework Coverage

Rules must support:

- **LangChain** (JavaScript/TypeScript)
- **LlamaIndex** (JavaScript/TypeScript)
- **OpenAI SDK** (official)
- **Anthropic Claude SDK**
- **Vercel AI SDK**
- **Custom LLM wrappers**

### False Positive Reduction

- Maximum 5% false positive rate
- Configurable severity levels
- Allow-list support for approved patterns
- Framework-specific exemptions

---

## Integration Examples

### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['@secure-coding/llm-security'],
  extends: ['plugin:@secure-coding/llm-security/recommended'],
  rules: {
    // LLM01: Prompt Injection
    '@secure-coding/llm-security/no-unsafe-prompt-concatenation': 'error',
    '@secure-coding/llm-security/require-prompt-template-parameterization':
      'warn',

    // LLM02: Information Disclosure
    '@secure-coding/llm-security/no-credentials-in-llm-context': 'error',
    '@secure-coding/llm-security/require-llm-output-redaction': 'error',

    // LLM05: Output Handling
    '@secure-coding/llm-security/no-direct-llm-output-execution': 'error',
    '@secure-coding/llm-security/require-llm-output-validation': 'error',

    // LLM06: Excessive Agency
    '@secure-coding/llm-security/require-human-approval-for-critical-actions':
      'error',
    '@secure-coding/llm-security/enforce-llm-tool-least-privilege': 'warn',

    // LLM10: Resource Limits
    '@secure-coding/llm-security/require-llm-token-limits': 'error',
    '@secure-coding/llm-security/require-llm-rate-limiting': 'warn',
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@secure-coding/llm-security/no-unsafe-prompt-concatenation': 'off',
      },
    },
  ],
};
```

### CI/CD Integration

```yaml
# .github/workflows/security-lint.yml
name: LLM Security Lint

on: [push, pull_request]

jobs:
  eslint-llm-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci
      - run: npm run lint:llm-security

      - name: Upload results
        if: always()
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: eslint-llm-results.sarif
```

---

## References

### OWASP Resources

1. **OWASP Top 10 for LLM Applications 2025**
   - https://genai.owasp.org/llm-top-10/

2. **OWASP GenAI Security Project**
   - https://owasp.org/www-project-genai-security/

3. **OWASP AI Security and Privacy Guide**
   - https://owasp.org/www-project-ai-security-and-privacy-guide/

### Industry Standards

4. **NIST AI Risk Management Framework**
   - https://www.nist.gov/itl/ai-risk-management-framework

5. **CWE - Common Weakness Enumeration**
   - https://cwe.mitre.org/

6. **LangChain Security Best Practices**
   - https://python.langchain.com/docs/security

### Academic Research

7. **Prompt Injection Attacks and Defenses**
   - https://arxiv.org/abs/2310.12815

8. **LLM Security Vulnerabilities and Mitigations**
   - https://arxiv.org/abs/2307.15043

---

## Contributing

### How to Propose a New Rule

1. **Create issue** with OWASP LLM mapping
2. **Provide examples** (vulnerable vs. secure code)
3. **Reference CVEs/incidents** if available
4. **Discuss detection strategy** with community
5. **Implement rule** with tests
6. **Submit PR** with documentation

### Community

- **Discord**: OWASP GenAI Security Channel
- **GitHub**: eslint-plugin-secure-coding/discussions
- **Monthly Office Hours**: First Tuesday, 2PM UTC

---

**Document Version**: 1.0  
**Last Updated**: December 12, 2025  
**Maintained by**: ESLint Secure Coding Team  
**License**: MIT  
**Contact**: ofriperetz.dev@gmail.com
