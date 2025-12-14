# OWASP Security Rules - Unified Implementation Roadmap for eslint-plugin-secure-coding

## Executive Summary

This unified roadmap consolidates security guidance from multiple OWASP standards to provide comprehensive coverage for the `eslint-plugin-secure-coding` package. It addresses security vulnerabilities across:

- **OWASP Top 10 for LLM Applications 2025** - AI/ML security
- **OWASP Top 10 for Agentic Applications 2026** - Autonomous AI agents
- **OWASP Mobile Top 10 2023** - Mobile application security
- **OWASP Mobile Top 10 2024** - Latest mobile security threats

**Target**: Enterprise-grade ESLint security rules covering traditional web, mobile, AI/LLM, and agentic application development.

**Philosophy**: Defense in depth through static code analysis that catches vulnerabilities before they reach production.

---

## Table of Contents

1. [LLM Security Rules (OWASP LLM Top 10 2025)](#1-llm-security-rules)
2. [Agentic AI Security Rules (OWASP Agentic Top 10 2026)](#2-agentic-ai-security-rules)
3. [Mobile Security Rules (OWASP Mobile Top 10)](#3-mobile-security-rules)
4. [Implementation Priorities](#4-implementation-priorities)
5. [Cross-Cutting Concerns](#5-cross-cutting-concerns)
6. [Testing & Validation Strategy](#6-testing--validation-strategy)
7. [Tooling & Integration](#7-tooling--integration)

---

## 1. LLM Security Rules (OWASP LLM Top 10 2025)

### LLM01: Prompt Injection

**Risk**: Attackers manipulate LLM behavior through malicious input

#### Existing Rules ✅

- `no-unvalidated-user-input` (Partial coverage)
- `no-improper-sanitization` (General, not LLM-specific)

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                                    | Description                                                                      | CWE Mapping    |
| ------------------------------------------ | -------------------------------------------------------------------------------- | -------------- |
| `no-unsafe-prompt-concatenation`           | Detects direct concatenation of user input into LLM prompts without sanitization | CWE-74, CWE-78 |
| `require-prompt-template-parameterization` | Enforces use of structured templates instead of string interpolation             | CWE-20         |
| `no-dynamic-system-prompts`                | Prevents runtime modification of system prompts without validation               | CWE-94         |
| `detect-indirect-prompt-injection-vectors` | Identifies code where external content (emails, docs) reaches LLM                | CWE-74         |

**Example Implementation:**

```typescript
// ❌ BAD - Direct concatenation
const prompt = 'Summarize this: ' + userInput;
await llm.complete(prompt);

// ❌ BAD - Template literal without sanitization
const prompt = `Process this data: ${externalDocument}`;

// ✅ GOOD - Parameterized prompt
const messages = [
  { role: 'system', content: 'You are a helpful assistant' },
  { role: 'user', content: validateAndSanitize(userInput) },
];

// ✅ GOOD - Using prompt guard
const safePrompt = promptGuard.sanitize(userInput);
await llm.complete(safePrompt);
```

##### 🟠 High Priority

| Rule ID                                  | Description                                                 | CWE    |
| ---------------------------------------- | ----------------------------------------------------------- | ------ |
| `require-input-sanitization-for-llm`     | Enforces sanitization functions on all inputs to LLM APIs   | CWE-20 |
| `detect-rag-injection-risks`             | Flags RAG/document inputs reaching LLM without CDR/scanning | CWE-74 |
| `no-user-controlled-prompt-instructions` | Flags cases where user input directly controls LLM behavior | CWE-73 |

---

### LLM02: Sensitive Information Disclosure

**Risk**: LLMs unintentionally reveal PII, credentials, or confidential data

#### Existing Rules ✅

- `no-exposed-sensitive-data`
- `no-sensitive-data-exposure`
- `no-hardcoded-credentials`

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                                    | Description                                                       | CWE     |
| ------------------------------------------ | ----------------------------------------------------------------- | ------- |
| `no-pii-in-llm-training-data`              | Detects potential PII exposure in data passed to fine-tuning APIs | CWE-359 |
| `require-llm-output-redaction`             | Enforces redaction/filtering of LLM responses before display      | CWE-200 |
| `no-credentials-in-llm-context`            | Flags API keys, tokens being passed to LLM context/memory         | CWE-522 |
| `detect-overly-permissive-llm-data-access` | Identifies LLM tools with access to entire databases/filesystems  | CWE-732 |

**Example Implementation:**

```typescript
// ❌ BAD - API key in prompt
const prompt = `Use this API key: ${process.env.API_KEY}`;

// ❌ BAD - Passing credentials in context
const context = {
  database: {
    password: dbPassword, // Exposed to LLM memory
  },
};

// ✅ GOOD - Credentials isolated from LLM
const dbClient = createSecureClient(process.env.DB_CONN_STRING);
const results = await dbClient.query(userQuery);
// Only results passed to LLM, not credentials

// ✅ GOOD - Redacting before LLM
const safeContext = redactCredentials(rawContext);
await llm.complete(prompt, { context: safeContext });
```

---

### LLM03: Supply Chain Vulnerabilities

**Risk**: Compromised training data, pre-trained models, or deployment platforms

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                                     | Description                                                         | CWE     |
| ------------------------------------------- | ------------------------------------------------------------------- | ------- |
| `require-model-provenance-verification`     | Enforces verification of model origins (Hugging Face, OpenAI, etc.) | CWE-494 |
| `no-unverified-model-downloads`             | Flags dynamic model loading without signature/hash verification     | CWE-494 |
| `require-training-data-validation`          | Enforces scanning/validation of datasets before fine-tuning         | CWE-20  |
| `detect-model-serving-infrastructure-risks` | Identifies unsafe model deployment (no auth, public endpoints)      | CWE-306 |

**Example Implementation:**

```typescript
// ❌ BAD - Loading unverified model
const model = await AutoModelForCausalLM.from_pretrained(
  'random-user/suspicious-model',
);

// ✅ GOOD - Verified model with pinned revision
const model = await AutoModelForCausalLM.from_pretrained(
  'openai-community/gpt2',
  {
    revision: '607a30d783dfa663caf39e06633721c8d4cfcd7e',
    cache_dir: './verified-models',
  },
);

// ✅ GOOD - Checksum verification
const modelPath = await downloadModel(
  'https://trusted-registry.com/model.bin',
  {
    expectedHash: 'sha256:abc123...',
    verifySignature: true,
  },
);
```

---

### LLM04: Data and Model Poisoning

**Risk**: Malicious manipulation of training datasets or fine-tuning processes

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                                     | Description                                               | CWE     |
| ------------------------------------------- | --------------------------------------------------------- | ------- |
| `require-training-data-provenance`          | Enforces metadata tracking for all training datasets      | CWE-346 |
| `detect-user-supplied-training-data`        | Flags user-generated content being added to training sets | CWE-20  |
| `no-auto-model-retraining-on-user-feedback` | Requires human review before model updates                | CWE-754 |
| `require-training-data-integrity-checks`    | Enforces hash verification of datasets                    | CWE-354 |

---

### LLM05: Improper Output Handling

**Risk**: Insufficient validation of LLM outputs leading to XSS, SQL injection, RCE

#### Existing Rules ✅

- `no-unsanitized-html`
- `no-sql-injection`
- `detect-eval-with-expression`
- `detect-child-process`

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                          | Description                                                 | CWE     |
| -------------------------------- | ----------------------------------------------------------- | ------- |
| `require-llm-output-validation`  | Requires explicit validation before using LLM responses     | CWE-20  |
| `no-direct-llm-output-execution` | Flags eval(), exec(), child_process with LLM-generated code | CWE-94  |
| `require-llm-output-encoding`    | Enforces HTML/SQL/shell encoding based on usage context     | CWE-116 |
| `detect-llm-generated-sql`       | Identifies potentially dangerous LLM-to-SQL patterns        | CWE-89  |

**Example Implementation:**

```typescript
// ❌ BAD - Directly executing LLM code
const code = await llm.complete('Generate a function that...');
eval(code); // DANGEROUS!

// ✅ GOOD - Sandboxed execution with validation
const code = await llm.complete('Generate a function that...');
const ast = parseToAST(code);
if (!isValidAST(ast)) throw new Error('Invalid code');

const risks = await analyzeCode(code);
if (risks.length > 0) throw new Error('Security risks detected');

const result = await runInSandbox(code, {
  timeout: 5000,
  memory: '128MB',
  allowedAPIs: ['Math', 'String', 'Array'],
  networkAccess: false,
});
```

---

### LLM06: Excessive Agency

**Risk**: Granting LLMs excessive autonomy, permissions, or tool access

#### Existing Rules ✅

- `no-privilege-escalation` (Partial coverage)

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                                       | Description                                                | CWE     |
| --------------------------------------------- | ---------------------------------------------------------- | ------- |
| `enforce-llm-tool-least-privilege`            | Ensures tools have minimal necessary permissions           | CWE-250 |
| `require-human-approval-for-critical-actions` | Requires confirmation before destructive/financial actions | CWE-284 |
| `no-auto-approved-llm-tools`                  | Flags tools that auto-execute without policy checks        | CWE-862 |
| `detect-llm-unrestricted-tool-access`         | Identifies LLM agents with access to all tools             | CWE-732 |

**Example Implementation:**

```typescript
// ❌ BAD - Auto-executing financial transfer
const transferTool = {
  execute: async (from, to, amount) => {
    return await bankAPI.transfer(from, to, amount); // No approval!
  },
};

// ✅ GOOD - Human approval required
const transferTool = {
  requiresApproval: true,
  riskLevel: 'critical',
  execute: async (from, to, amount, context) => {
    const approval = await context.requestApproval({
      action: 'transfer_funds',
      details: { from, to, amount },
      risk: 'high',
      timeout: 300000,
    });

    if (!approval.granted) {
      throw new Error('Transfer denied by human operator');
    }

    return await bankAPI.transfer(from, to, amount);
  },
};
```

---

### LLM07: System Prompt Leakage

**Risk**: Unintentional exposure of system prompts containing instructions/configurations

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                                    | Description                                               | CWE     |
| ------------------------------------------ | --------------------------------------------------------- | ------- |
| `no-system-prompt-in-output`               | Detects code that might echo system prompts to users      | CWE-200 |
| `require-system-prompt-isolation`          | Ensures system prompts aren't accessible via LLM queries  | CWE-552 |
| `detect-prompt-extraction-vulnerabilities` | Identifies patterns that might reveal system instructions | CWE-200 |

---

### LLM08: Vector and Embedding Weaknesses

**Risk**: Improper access or manipulation of vector databases/embeddings

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                              | Description                                                       | CWE     |
| ------------------------------------ | ----------------------------------------------------------------- | ------- |
| `require-vector-db-access-control`   | Requires authentication/authorization for vector DB operations    | CWE-862 |
| `detect-embedding-poisoning-risks`   | Identifies code allowing untrusted embedding inputs               | CWE-20  |
| `require-vector-namespace-isolation` | Requires multi-tenant separation in vector stores                 | CWE-668 |
| `no-unvalidated-embeddings`          | Requires validation of embedding vectors before storage/retrieval | CWE-20  |

**Example Implementation:**

```typescript
// ❌ BAD - No namespace isolation
const vectorStore = new PineconeStore({
  indexName: 'shared-embeddings', // All tenants share!
});

// ✅ GOOD - Namespace isolation
const vectorStore = new PineconeStore({
  indexName: 'embeddings',
  namespace: `tenant-${tenantId}`, // Isolated per tenant
});

// ✅ GOOD - Index-per-tenant
const vectorStore = new PineconeStore({
  indexName: `embeddings-tenant-${tenantId}`, // Dedicated index
});
```

---

### LLM09: Misinformation

**Risk**: Generating/propagating incorrect information

##### 🟡 Medium Priority

| Rule ID                            | Description                                               | CWE     |
| ---------------------------------- | --------------------------------------------------------- | ------- |
| `require-llm-fact-checking`        | Requires fact-checking mechanisms for critical assertions | CWE-754 |
| `require-llm-confidence-scoring`   | Enforces confidence scores for LLM outputs                | CWE-754 |
| `detect-unverified-llm-assertions` | Flags LLM outputs used as facts without verification      | CWE-754 |

---

### LLM10: Unbounded Consumption

**Risk**: Excessive resource consumption/DoS

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                     | Description                                   | CWE     |
| --------------------------- | --------------------------------------------- | ------- |
| `require-llm-rate-limiting` | Enforces rate limiting for LLM API calls      | CWE-770 |
| `require-llm-token-budget`  | Requires token usage caps per request/user    | CWE-770 |
| `detect-llm-infinite-loops` | Identifies potential infinite reasoning loops | CWE-834 |

---

## 2. Agentic AI Security Rules (OWASP Agentic Top 10 2026)

### ASI01: Agent Goal Hijack

**Risk**: Attackers manipulate agent objectives through natural-language inputs

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                            | Description                                           | CWE Mapping |
| ---------------------------------- | ----------------------------------------------------- | ----------- |
| `no-unsafe-agent-goal-setting`     | Prevents user-controlled goal modification            | CWE-74      |
| `require-goal-validation-gate`     | Enforces validation before goal-changing actions      | CWE-284     |
| `detect-goal-manipulation-vectors` | Identifies indirect goal injection through RAG/emails | CWE-74      |

**Example Implementation:**

```typescript
// ❌ BAD - User can modify agent goals
const agent = new Agent({
  goal: userProvidedGoal, // Direct injection!
});

// ✅ GOOD - Validated, locked goals
const agent = new Agent({
  goal: APPROVED_GOALS[goalType],
  allowGoalModification: false,
  requireApprovalForGoalChange: true,
});
```

---

### ASI02: Tool Misuse & Exploitation

**Risk**: Agents misuse legitimate tools due to insufficient access controls

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                              | Description                                               | CWE     |
| ------------------------------------ | --------------------------------------------------------- | ------- |
| `require-tool-permission-validation` | Requires validation of tool permissions before invocation | CWE-862 |
| `no-unvalidated-tool-parameters`     | Enforces schema validation on tool arguments              | CWE-20  |
| `require-tool-rate-limiting`         | Enforces rate limiting configuration for tools            | CWE-770 |
| `enforce-tool-least-privilege`       | Ensures tools declare minimal required permissions        | CWE-250 |

**Example Implementation:**

```typescript
// ❌ BAD - Tool execution without permission check
async function executeTool(toolName, params) {
  return await tools[toolName].run(params);
}

// ✅ GOOD - Permission check + validation
async function executeTool(toolName, params, context) {
  if (!hasPermission(context.user, toolName)) {
    throw new Error('Unauthorized tool access');
  }
  const validatedParams = validateToolParams(toolName, params);
  return await tools[toolName].run(validatedParams);
}

// ✅ GOOD - Least privilege tool definition
agent.registerTool('querySalesforce', {
  permissions: ['read:opportunity'], // Scoped, not "read:*"
  rateLimit: { maxCalls: 100, window: '1m' },
  validator: salesforceQuerySchema,
});
```

---

### ASI03: Identity & Privilege Abuse

**Risk**: Exploiting dynamic trust and delegated permissions

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                                    | Description                                              | CWE     |
| ------------------------------------------ | -------------------------------------------------------- | ------- |
| `no-hardcoded-agent-credentials`           | Detects hardcoded secrets in agent configurations        | CWE-798 |
| `require-task-scoped-credentials`          | Enforces ephemeral credentials bound to specific tasks   | CWE-287 |
| `no-credential-caching-in-memory`          | Flags storage of credentials in long-term memory/context | CWE-522 |
| `no-privilege-inheritance-without-scoping` | Flags delegation without least-privilege filters         | CWE-269 |

---

### ASI04: Agentic Supply Chain Vulnerabilities

**Risk**: Malicious or compromised tools, plugins, prompts, or agents loaded at runtime

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                      | Description                                                    | CWE      |
| ---------------------------- | -------------------------------------------------------------- | -------- |
| `require-signed-mcp-servers` | Enforces cryptographic signature checks on MCP servers         | CWE-494  |
| `no-dynamic-tool-loading`    | Flags dynamic imports of agent tools without provenance checks | CWE-494  |
| `require-dependency-pinning` | Ensures prompts, tools, configs use commit/content hashes      | CWE-829  |
| `require-aibom-for-agents`   | Enforces AIBOM/SBOM generation for agent components            | CWE-1357 |

**Example Implementation:**

```typescript
// ❌ BAD - Loading unverified MCP server
const client = await createMCPClient('https://random-mcp-server.com');

// ✅ GOOD - Signature verification required
const client = await createMCPClient('https://trusted-mcp.com', {
  verifySignature: true,
  trustedPublicKeys: [process.env.MCP_PUBLIC_KEY],
});

// ✅ GOOD - Pinned with content hash
const tool = await loadTool('npm:@verified/tool@sha256:abc123...', {
  requireSignature: true,
  allowedRegistries: ['registry.npmjs.org'],
});
```

---

### ASI05: Unexpected Code Execution (RCE)

**Risk**: Agents generate/execute code unsafely leading to RCE

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                               | Description                                          | CWE     |
| ------------------------------------- | ---------------------------------------------------- | ------- |
| `no-eval-in-production-agents`        | Prohibits eval, Function constructor in production   | CWE-95  |
| `no-unsafe-code-generation`           | Detects code generation without validation gates     | CWE-94  |
| `require-sandbox-for-code-execution`  | Enforces sandboxed execution environments            | CWE-94  |
| `no-unsafe-deserialization-in-agents` | Flags deserialize/pickle/unmarshal on untrusted data | CWE-502 |

---

### ASI06: Memory & Context Poisoning

**Risk**: Adversaries corrupt stored information (RAG, memory) to bias reasoning

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                              | Description                                                  | CWE     |
| ------------------------------------ | ------------------------------------------------------------ | ------- |
| `require-memory-input-validation`    | Enforces content scanning before memory commits              | CWE-20  |
| `prevent-output-reingestion`         | Flags code that feeds agent outputs back into trusted memory | CWE-349 |
| `require-memory-segmentation`        | Enforces per-user/per-task memory isolation                  | CWE-668 |
| `require-memory-provenance-tracking` | Ensures stored data includes provenance metadata             | CWE-346 |

**Example Implementation:**

```typescript
// ❌ BAD - Feeding agent output back into memory
const response = await agent.complete(userQuery);
await agent.memory.store(response); // Self-reinforcing contamination

// ✅ GOOD - Validation gate before storage
const response = await agent.complete(userQuery);
const sanitized = await contentValidator.scan(response, {
  checkForMaliciousInstructions: true,
  checkForSensitiveData: true,
});

if (sanitized.isSafe) {
  await agent.memory.store(response, {
    source: 'agent-generated',
    trustScore: 0.3,
    ttl: '24h',
  });
}
```

---

### ASI07: Insecure Inter-Agent Communication

**Risk**: Messages between agents lack authentication, integrity, or semantic validation

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                                 | Description                                                | CWE     |
| --------------------------------------- | ---------------------------------------------------------- | ------- |
| `require-encrypted-agent-communication` | Enforces mTLS or equivalent for agent-to-agent channels    | CWE-319 |
| `require-message-signing`               | Enforces cryptographic signing of inter-agent messages     | CWE-345 |
| `no-unvalidated-agent-messages`         | Enforces schema + semantic validation on received messages | CWE-20  |
| `enforce-mutual-authentication`         | Requires both client and server certificate validation     | CWE-295 |

---

### ASI08: Cascading Failures

**Risk**: Single fault propagates across agents, compounding into system-wide harm

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                              | Description                                             | CWE     |
| ------------------------------------ | ------------------------------------------------------- | ------- |
| `require-circuit-breaker-pattern`    | Enforces circuit breaker implementation for agent calls | CWE-755 |
| `require-execution-validation-gates` | Enforces policy checks between planner and executor     | CWE-754 |
| `enforce-blast-radius-limits`        | Requires rate limits and progress caps per agent        | CWE-770 |

---

### ASI09: Human-Agent Trust Exploitation

**Risk**: Agent's fluency exploited to manipulate human decisions

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                                          | Description                                                  | CWE     |
| ------------------------------------------------ | ------------------------------------------------------------ | ------- |
| `require-human-approval-for-sensitive-actions`   | Enforces human confirmation before destructive operations    | CWE-284 |
| `require-action-confirmation-ui`                 | Enforces multi-step approval UI for risky actions            | CWE-862 |
| `prevent-auto-execution-of-sensitive-operations` | Flags auto-execution of transfers, deletions, config changes | CWE-862 |

---

### ASI10: Rogue Agents

**Risk**: Malicious or compromised agents deviate from intended behavior

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                       | Description                                                      | CWE     |
| ----------------------------- | ---------------------------------------------------------------- | ------- |
| `require-agent-attestation`   | Enforces cryptographic identity attestation                      | CWE-346 |
| `require-behavioral-manifest` | Enforces declaration of expected tools, goals, capabilities      | CWE-693 |
| `require-agent-kill-switch`   | Enforces implementation of instant disable/revocation capability | CWE-703 |

---

## 3. Mobile Security Rules (OWASP Mobile Top 10)

### M1: Improper Credential Usage

#### Existing Rules ✅

- `no-hardcoded-credentials`

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                                | Description                                         | Platform | CWE     |
| -------------------------------------- | --------------------------------------------------- | -------- | ------- |
| `require-keychain-for-credentials`     | Enforces iOS Keychain usage for credentials         | iOS      | CWE-522 |
| `require-android-keystore`             | Enforces Android Keystore for cryptographic keys    | Android  | CWE-522 |
| `no-credentials-in-shared-preferences` | Flags credentials in SharedPreferences/UserDefaults | Both     | CWE-522 |
| `require-biometric-protection`         | Requires biometric auth for sensitive credentials   | Both     | CWE-287 |

**Example Implementation:**

```swift
// ❌ BAD - Credentials in UserDefaults (iOS)
UserDefaults.standard.set(apiKey, forKey: "apiKey")

// ✅ GOOD - iOS Keychain
let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrAccount as String: "apiKey",
    kSecValueData as String: apiKey.data(using: .utf8)!,
    kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
]
SecItemAdd(query as CFDictionary, nil)
```

```kotlin
// ❌ BAD - Credentials in SharedPreferences (Android)
sharedPrefs.edit().putString("apiKey", apiKey).apply()

// ✅ GOOD - Android EncryptedSharedPreferences
val masterKey = MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .build()

val encryptedPrefs = EncryptedSharedPreferences.create(
    context,
    "secure_credentials",
    masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)

encryptedPrefs.edit().putString("apiKey", apiKey).apply()
```

---

### M2: Inadequate Supply Chain Security

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                              | Description                                           | CWE      |
| ------------------------------------ | ----------------------------------------------------- | -------- |
| `require-sbom-generation`            | Enforces SBOM generation (CycloneDX/SPDX)             | CWE-1357 |
| `require-dependency-scanning`        | Requires automated vulnerability scanning             | CWE-1104 |
| `detect-typosquatted-dependencies`   | Warns on dependency names similar to popular packages | CWE-506  |
| `require-dependency-version-pinning` | Prevents use of floating versions/wildcards           | CWE-829  |

---

### M3: Insecure Authentication/Authorization

#### Existing Rules ✅

- `no-privilege-escalation`

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                             | Description                                      | CWE     |
| ----------------------------------- | ------------------------------------------------ | ------- |
| `require-server-side-authorization` | Prevents client-side authorization checks        | CWE-602 |
| `require-oauth-pkce`                | Enforces PKCE for OAuth flows in mobile apps     | CWE-863 |
| `no-client-side-session-management` | Flags client-side session handling               | CWE-384 |
| `require-biometric-authentication`  | Requires biometric auth for sensitive operations | CWE-287 |

---

### M4: Insufficient Input/Output Validation

#### Existing Rules ✅

- `no-sql-injection`
- `no-unsanitized-html`

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                                   | Description                                          | CWE     |
| ----------------------------------------- | ---------------------------------------------------- | ------- |
| `require-webview-sanitization`            | Enforces content sanitization before WebView loading | CWE-79  |
| `no-javascript-bridge-without-validation` | Requires validation on JavaScript bridge calls       | CWE-20  |
| `require-file-upload-validation`          | Enforces file type and size validation               | CWE-434 |

---

### M5: Insecure Communication

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                           | Description                                | Platform | CWE     |
| --------------------------------- | ------------------------------------------ | -------- | ------- |
| `require-tls-1-3`                 | Enforces TLS 1.3 (minimum TLS 1.2)         | Both     | CWE-326 |
| `require-certificate-pinning`     | Requires certificate/public key pinning    | Both     | CWE-295 |
| `no-cleartext-traffic`            | Flags unencrypted HTTP traffic             | Both     | CWE-319 |
| `require-ats-compliance`          | Enforces App Transport Security (iOS)      | iOS      | CWE-319 |
| `require-network-security-config` | Requires Network Security Config (Android) | Android  | CWE-319 |

**Example Implementation:**

```xml
<!-- Android Network Security Config -->
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- ❌ BAD -->
    <base-config cleartextTrafficPermitted="true">
    </base-config>

    <!-- ✅ GOOD -->
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>

    <domain-config>
        <domain includeSubdomains="true">api.example.com</domain>
        <pin-set expiration="2025-12-31">
            <pin digest="SHA-256">primary_key_hash_base64</pin>
            <pin digest="SHA-256">backup_key_hash_base64</pin>
        </pin-set>
    </domain-config>
</network-security-config>
```

---

### M6: Inadequate Privacy Controls

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                        | Description                                | CWE     |
| ------------------------------ | ------------------------------------------ | ------- |
| `require-privacy-manifest`     | Requires privacy manifest/policy alignment | CWE-359 |
| `detect-excessive-permissions` | Identifies unnecessary permission requests | CWE-250 |
| `require-consent-management`   | Enforces granular consent controls         | CWE-359 |
| `no-pii-in-analytics`          | Flags PII being sent to analytics services | CWE-359 |

---

### M7: Insufficient Binary Protections

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                            | Description                                          | Platform | CWE     |
| ---------------------------------- | ---------------------------------------------------- | -------- | ------- |
| `require-code-obfuscation`         | Requires R8/ProGuard (Android) or Swift optimization | Both     | CWE-656 |
| `no-debuggable-production-build`   | Detects debuggable flag in production builds         | Android  | CWE-489 |
| `require-root-jailbreak-detection` | Requires root/jailbreak detection implementation     | Both     | CWE-250 |
| `require-anti-tampering`           | Requires signature/integrity verification            | Both     | CWE-494 |

---

### M8: Security Misconfiguration

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                                     | Description                                           | Platform | CWE     |
| ------------------------------------------- | ----------------------------------------------------- | -------- | ------- |
| `no-verbose-logging-production`             | Detects verbose logging in production builds          | Both     | CWE-532 |
| `require-backup-exclusion`                  | Requires backup exclusion for sensitive data          | Both     | CWE-530 |
| `no-exported-components-without-permission` | Flags exported Android components without permissions | Android  | CWE-927 |
| `require-secure-webview-config`             | Enforces secure WebView configuration                 | Both     | CWE-749 |

---

### M9: Insecure Data Storage

#### Existing Rules ✅

- `no-exposed-sensitive-data`

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                           | Description                                  | Platform | CWE     |
| --------------------------------- | -------------------------------------------- | -------- | ------- |
| `require-encrypted-storage`       | Requires encryption for sensitive local data | Both     | CWE-311 |
| `no-sensitive-data-in-cache`      | Flags sensitive data in cache directories    | Both     | CWE-524 |
| `require-sqlcipher-for-db`        | Requires database encryption (SQLCipher)     | Both     | CWE-311 |
| `no-sensitive-data-in-temp-files` | Detects sensitive data in temporary files    | Both     | CWE-524 |

---

### M10: Insufficient Cryptography

#### Existing Rules ✅

- `no-weak-crypto-algorithm`

#### New Rules Needed 🆕

##### 🔴 Critical Priority

| Rule ID                            | Description                              | CWE     |
| ---------------------------------- | ---------------------------------------- | ------- |
| `no-deprecated-crypto-algorithms`  | Flags MD5, SHA1, DES, RC4 usage          | CWE-327 |
| `require-secure-random`            | Requires SecureRandom/SecRandomCopyBytes | CWE-330 |
| `no-hardcoded-crypto-keys`         | Detects hardcoded encryption keys        | CWE-321 |
| `require-authenticated-encryption` | Requires AES-GCM or similar AEAD         | CWE-327 |

**Example Implementation:**

```swift
// ❌ BAD - Weak algorithm (iOS)
let hash = Insecure.MD5.hash(data: data) // Deprecated!

// ✅ GOOD - Strong algorithm
import CryptoKit
let hash = SHA256.hash(data: data)

// ❌ BAD - Hardcoded key
let key = "1234567890abcdef".data(using: .utf8)!

// ✅ GOOD - Generate secure key
let key = SymmetricKey(size: .bits256)
// Store in Keychain
```

```kotlin
// ❌ BAD - Weak random (Android)
val random = Random()
val iv = ByteArray(16)
random.nextBytes(iv) // Predictable!

// ✅ GOOD - Secure random
import java.security.SecureRandom
val secureRandom = SecureRandom()
val iv = ByteArray(16)
secureRandom.nextBytes(iv)
```

---

## 4. Implementation Priorities

### Phase 1: Foundation (Q1 2026) - 🔴 Critical Rules

**Focus**: Highest impact rules with broad applicability

#### Sprint 1 (Weeks 1-3): Credential & Secret Management

- [ ] `no-hardcoded-credentials` (enhancement)
- [ ] `no-hardcoded-agent-credentials`
- [ ] `no-credentials-in-llm-context`
- [ ] `no-hardcoded-crypto-keys`
- [ ] `require-keychain-for-credentials` (iOS)
- [ ] `require-android-keystore` (Android)

**Deliverables:**

- 6 new/enhanced ESLint rules
- Comprehensive test coverage (>90%)
- Documentation with examples
- Integration tests

#### Sprint 2 (Weeks 4-6): Injection Prevention

- [ ] `no-unsafe-prompt-concatenation`
- [ ] `require-prompt-template-parameterization`
- [ ] `no-dynamic-system-prompts`
- [ ] `no-unsafe-agent-goal-setting`
- [ ] `require-webview-sanitization`

**Deliverables:**

- 5 new ESLint rules
- Attack pattern detection
- Sanitization function detection
- Type-safe template validation

#### Sprint 3 (Weeks 7-9): Code Execution Safety

- [ ] `no-eval-in-production-agents`
- [ ] `no-direct-llm-output-execution`
- [ ] `no-unsafe-code-generation`
- [ ] `require-sandbox-for-code-execution`
- [ ] `no-unsafe-deserialization-in-agents`

**Deliverables:**

- 5 new ESLint rules
- Sandbox pattern detection
- Validation gate detection

#### Sprint 4 (Weeks 10-12): Access Control

- [ ] `enforce-llm-tool-least-privilege`
- [ ] `require-tool-permission-validation`
- [ ] `require-human-approval-for-critical-actions`
- [ ] `require-server-side-authorization`
- [ ] `no-client-side-session-management`

---

### Phase 2: Communication & Storage Security (Q2 2026) - 🔴🟠 Critical & High

#### Sprint 5 (Weeks 13-15): Network Security

- [ ] `require-tls-1-3`
- [ ] `require-certificate-pinning`
- [ ] `no-cleartext-traffic`
- [ ] `require-encrypted-agent-communication`
- [ ] `require-message-signing`

#### Sprint 6 (Weeks 16-18): Data Protection

- [ ] `require-encrypted-storage`
- [ ] `no-sensitive-data-in-cache`
- [ ] `require-sqlcipher-for-db`
- [ ] `require-memory-segmentation`
- [ ] `require-vector-namespace-isolation`

#### Sprint 7 (Weeks 19-21): Supply Chain Security

- [ ] `require-model-provenance-verification`
- [ ] `no-unverified-model-downloads`
- [ ] `require-signed-mcp-servers`
- [ ] `no-dynamic-tool-loading`
- [ ] `require-sbom-generation`

---

### Phase 3: Advanced Protection (Q3 2026) - 🟠🟡 High & Medium

#### Sprint 8 (Weeks 22-24): Memory & Context Safety

- [ ] `require-memory-input-validation`
- [ ] `prevent-output-reingestion`
- [ ] `require-memory-provenance-tracking`
- [ ] `enforce-memory-ttl`
- [ ] `detect-cross-tenant-memory-bleed`

#### Sprint 9 (Weeks 25-27): Failure Resilience

- [ ] `require-circuit-breaker-pattern`
- [ ] `require-execution-validation-gates`
- [ ] `enforce-blast-radius-limits`
- [ ] `require-agent-isolation-boundaries`
- [ ] `require-llm-rate-limiting`

#### Sprint 10 (Weeks 28-30): Observability & Monitoring

- [ ] `require-agent-attestation`
- [ ] `require-behavioral-manifest`
- [ ] `require-agent-kill-switch`
- [ ] `enforce-agent-behavioral-monitoring`
- [ ] `require-immutable-audit-logs`

---

### Phase 4: Platform-Specific & Edge Cases (Q4 2026) - 🟡🟢 Medium & Low

#### Sprint 11 (Weeks 31-33): Mobile Platform Hardening

- [ ] `require-code-obfuscation`
- [ ] `no-debuggable-production-build`
- [ ] `require-root-jailbreak-detection`
- [ ] `require-anti-tampering`
- [ ] `no-exported-components-without-permission`

#### Sprint 12 (Weeks 34-36): Privacy & Compliance

- [ ] `require-privacy-manifest`
- [ ] `detect-excessive-permissions`
- [ ] `require-consent-management`
- [ ] `no-pii-in-analytics`
- [ ] `no-pii-in-llm-training-data`

#### Sprint 13 (Weeks 37-39): Advanced Threats

- [ ] `detect-llm-fact-checking`
- [ ] `require-llm-confidence-scoring`
- [ ] `detect-prompt-extraction-vulnerabilities`
- [ ] `detect-collusion-patterns`
- [ ] `detect-agent-replication-attempts`

---

## 5. Cross-Cutting Concerns

### Rule Architecture

All rules should follow a consistent architecture:

```typescript
// Rule template structure
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Clear, concise description',
      category: 'Security', // LLM Security, Agentic Security, Mobile Security
      recommended: true,
      url: 'https://docs.example.com/rule-name',
      owaspMapping: ['LLM01', 'ASI02', 'M3'], // Multiple mappings possible
      cweMapping: ['CWE-74', 'CWE-20'],
    },
    messages: {
      violation: 'Message with suggestion',
      suggestion: 'How to fix',
    },
    fixable: 'code', // when automatic fixes are safe
    schema: [], // Configuration options
  },
  create(context) {
    return {
      // AST visitor patterns
    };
  },
};
```

### Common Patterns to Detect

#### 1. Unsafe String Concatenation

```typescript
// Pattern detection
function isUnsafeConcatenation(node) {
  return (
    node.type === 'BinaryExpression' &&
    node.operator === '+' &&
    isUserInput(node.right) &&
    isLLMPrompt(node.left)
  );
}
```

#### 2. Missing Validation

```typescript
// Pattern detection
function isMissingValidation(node) {
  const apiCall = findLLMAPICall(node);
  const inputSource = findInputSource(apiCall);
  const validationCall = findValidationBetween(inputSource, apiCall);
  return !validationCall;
}
```

#### 3. Hardcoded Secrets

```typescript
// Pattern detection using entropy and patterns
function detectHardcodedSecret(value) {
  const patterns = [
    /sk-[a-zA-Z0-9]{32,}/, // OpenAI API keys
    /AIza[0-9A-Za-z-_]{35}/, // Google API keys
    /[a-zA-Z0-9/+=]{40,}/, // Generic base64 secrets
  ];

  const entropy = calculateEntropy(value);
  return patterns.some((p) => p.test(value)) && entropy > 4.5;
}
```

### Framework-Specific Support

Rules should support common frameworks:

- **LLM Frameworks**: LangChain, LlamaIndex, OpenAI SDK, Anthropic SDK
- **Agent Frameworks**: AutoGPT, CrewAI, LangGraph, Semantic Kernel
- **Mobile Frameworks**: React Native, Flutter, Xamarin, Ionic
- **Backend**: Express, Fastify, NestJS, Next.js

### Configuration Flexibility

```javascript
// .eslintrc.js example
module.exports = {
  plugins: ['@secure-coding'],
  rules: {
    // Basic configuration
    '@secure-coding/no-unsafe-prompt-concatenation': 'error',

    // With options
    '@secure-coding/require-llm-output-validation': [
      'error',
      {
        requiredValidators: ['sanitize', 'validate'],
        allowedLLMProviders: ['openai', 'anthropic'],
        strictMode: true,
      },
    ],

    // Mobile-specific
    '@secure-coding/require-keychain-for-credentials': [
      'error',
      {
        platform: 'ios',
        minimumAccessibility: 'whenUnlockedThisDeviceOnly',
        requireBiometric: true,
      },
    ],
  },
};
```

---

## 6. Testing & Validation Strategy

### Test Categories

#### 1. Unit Tests (Per Rule)

```typescript
// test/rules/no-unsafe-prompt-concatenation.test.ts
import { RuleTester } from 'eslint';
import rule from '../../rules/no-unsafe-prompt-concatenation';

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('no-unsafe-prompt-concatenation', rule, {
  valid: [
    {
      code: `
        const messages = [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: sanitize(userInput) }
        ];
      `,
    },
  ],
  invalid: [
    {
      code: `const prompt = 'Summarize: ' + userInput;`,
      errors: [
        {
          messageId: 'unsafeConcatenation',
          type: 'BinaryExpression',
        },
      ],
    },
  ],
});
```

#### 2. Integration Tests

```typescript
// test/integration/llm-security.test.ts
describe('LLM Security Rules Integration', () => {
  it('should detect prompt injection chain', async () => {
    const code = `
      const userInput = req.body.input;
      const prompt = \`Process: \${userInput}\`;
      await openai.complete(prompt);
    `;

    const results = await lintCode(code);

    expect(results).toContainErrors([
      'no-unsafe-prompt-concatenation',
      'require-prompt-template-parameterization',
    ]);
  });
});
```

#### 3. Real-World Pattern Tests

Maintain a corpus of real-world vulnerable code from:

- GitHub security advisories
- CVE databases
- Bug bounty reports
- Academic papers

#### 4. False Positive Testing

```typescript
describe('False Positive Prevention', () => {
  it('should not flag safe sanitized concatenation', () => {
    const code = `
      const safeInput = promptSanitizer.sanitize(userInput);
      const prompt = 'Summarize: ' + safeInput;
    `;

    const results = await lintCode(code);
    expect(results).toHaveNoErrors();
  });
});
```

### Coverage Targets

- **Code Coverage**: ≥95% for all rule implementations
- **Pattern Coverage**: ≥90% of known attack patterns
- **Framework Coverage**: Top 5 frameworks per category
- **False Positive Rate**: <5%
- **False Negative Rate**: <2%

### Benchmark Suite

Create benchmark dataset with:

- 1000+ labeled code samples
- Mix of vulnerable and safe patterns
- Multiple frameworks and languages
- Regular updates from latest CVEs

---

## 7. Tooling & Integration

### Development Tools

#### ESLint Plugin Testing

```bash
# Local testing
npm run test:rules

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Benchmark
npm run benchmark
```

#### Rule Generator CLI

```bash
# Generate new rule template
npm run generate:rule -- --name no-unsafe-feature --category llm-security

# Generate from OWASP ID
npm run generate:rule:owasp -- --id LLM01 --risk "Prompt Injection"
```

### CI/CD Integration

```yaml
# .github/workflows/security-lint.yml
name: Security Linting

on: [push, pull_request]

jobs:
  security-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint Security Rules
        run: |
          npm run lint:security

      - name: Upload results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: eslint-security-results.sarif

      - name: Fail on high severity
        run: |
          if grep -q '"severity": "error"' eslint-results.json; then
            echo "High severity issues found"
            exit 1
          fi
```

### IDE Integration

#### VS Code Extension

```json
{
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "eslint.rules.customizations": [
    {
      "rule": "@secure-coding/*",
      "severity": "error"
    }
  ]
}
```

#### IntelliJ/WebStorm

```xml
<component name="EslintConfiguration">
  <option name="packageJsonPath" value="$PROJECT_DIR$/package.json" />
  <option name="rulesDirectory" value="node_modules/@secure-coding/eslint-plugin" />
</component>
```

### SARIF Output Support

```typescript
// Generate SARIF for security dashboards
export function generateSARIF(results: LintResult[]): SARIF {
  return {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [
      {
        tool: {
          driver: {
            name: 'eslint-plugin-secure-coding',
            version: '2.2.0',
            informationUri: 'https://github.com/...',
            rules: results.map(toSARIFRule),
          },
        },
        results: results.map(toSARIFResult),
      },
    ],
  };
}
```

### Reporting & Dashboards

#### Security Metrics Dashboard

- Total rules triggered
- Severity breakdown
- OWASP category coverage
- Trend over time
- Remediation time tracking

#### Integration with Security Platforms

- Snyk
- SonarQube
- Checkmarx
- GitHub Advanced Security
- GitLab Security Dashboard

---

## Summary

This unified roadmap provides comprehensive security coverage across:

### Coverage Metrics

| Category             | Total Rules | Critical | High   | Medium | Low   |
| -------------------- | ----------- | -------- | ------ | ------ | ----- |
| **LLM Security**     | 45          | 28       | 12     | 5      | 0     |
| **Agentic Security** | 52          | 35       | 13     | 4      | 0     |
| **Mobile Security**  | 48          | 32       | 12     | 4      | 0     |
| **TOTAL**            | **145**     | **95**   | **37** | **13** | **0** |

### OWASP Mapping

All rules map to one or more of:

- OWASP Top 10 LLM Applications (2025)
- OWASP Top 10 Agentic Applications (2026)
- OWASP Mobile Top 10 (2023/2024)
- CWE (Common Weakness Enumeration)

### Implementation Timeline

- **Phase 1 (Q1 2026)**: 25 critical rules - Foundation
- **Phase 2 (Q2 2026)**: 30 critical/high rules - Communication & Storage
- **Phase 3 (Q3 2026)**: 25 high/medium rules - Advanced Protection
- **Phase 4 (Q4 2026)**: 20 medium rules - Platform-Specific

**Total**: 100 new rules across 4 quarters

### Success Criteria

✅ 100% coverage of OWASP LLM/Agentic/Mobile Top 10
✅ <5% false positive rate
✅ ≥95% test coverage
✅ Support for top 5 frameworks per category
✅ Automated SARIF reporting
✅ CI/CD integration examples
✅ Comprehensive documentation

---

## Next Steps

1. **Review & Prioritize**: Validate rule priorities with security team
2. **Set Up Infrastructure**: Rule templates, testing framework, CI/CD
3. **Sprint Planning**: Assign rules to sprints based on dependencies
4. **Community Engagement**: Open source contribution guidelines
5. **Documentation**: Maintain up-to-date docs with examples
6. **Continuous Improvement**: Regular updates based on new vulnerabilities

---

**Document Version**: 1.0
**Last Updated**: {{ current_date }}
**Maintained By**: Security Team / ESLint Plugin Contributors
**License**: Creative Commons Attribution-ShareAlike 4.0
