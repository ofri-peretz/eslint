# ESLint Rules Roadmap: OWASP Top 10 for Agentic Applications 2026

## Executive Summary

This roadmap maps the **OWASP Top 10 for Agentic Applications 2026** to actionable ESLint security rules. Each OWASP Agentic Security Initiative (ASI) entry is analyzed for static code analysis opportunities, with proposed ESLint rules that can detect vulnerabilities at development time.

**Target**: `eslint-plugin-secure-coding` enhancement for AI/Agentic application security

**Priority Levels**:

- 🔴 **Critical**: High impact, high feasibility for static analysis
- 🟠 **High**: Significant security value, moderate complexity
- 🟡 **Medium**: Important but requires runtime context or complex analysis
- 🟢 **Low**: Educational value, limited static detection capability

---

## ASI01: Agent Goal Hijack

> **Risk**: Attackers manipulate agent objectives through natural-language inputs (prompt injection)

### Detectable via ESLint

#### 🔴 Critical Priority

| Rule ID                           | Rule Name                                      | Description                                                                      | CWE Mapping    |
| --------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------- | -------------- |
| `no-unsafe-prompt-concatenation`  | Prevent unsafe prompt string concatenation     | Detects direct concatenation of user input into LLM prompts without sanitization | CWE-78, CWE-74 |
| `no-unvalidated-llm-input`        | Require input validation before LLM processing | Enforces validation functions on user inputs before passing to AI/LLM APIs       | CWE-20         |
| `require-prompt-injection-guards` | Require prompt injection defenses              | Ensures prompts use parameterization or sanitization patterns                    | CWE-74         |

#### 🟠 High Priority

| Rule ID                              | Rule Name                                      | Description                                                                              | CWE Mapping |
| ------------------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------- |
| `no-dynamic-system-prompts`          | Prevent runtime modification of system prompts | Flags system prompts that can be altered at runtime without validation                   | CWE-94      |
| `require-input-sanitization-for-rag` | Require sanitization of RAG/document inputs    | Enforces Content Disarm & Reconstruction (CDR) for external documents                    | CWE-20      |
| `detect-indirect-prompt-injection`   | Detect potential indirect injection vectors    | Identifies code paths where external content (emails, docs) reaches LLM without scanning | CWE-74      |

#### 🟡 Medium Priority

| Rule ID                           | Rule Name                                       | Description                                                                | CWE Mapping |
| --------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------- | ----------- |
| `require-goal-validation-gate`    | Enforce validation before goal-changing actions | Requires explicit approval mechanism when agent goals/objectives change    | CWE-284     |
| `no-user-controlled-instructions` | Prevent user-controlled agent instructions      | Flags cases where user input directly controls agent behavior/instructions | CWE-73      |

### Example Implementation: `no-unsafe-prompt-concatenation`

```javascript
// ❌ Bad - Direct concatenation
const prompt = 'Summarize this: ' + userInput;
await llm.complete(prompt);

// ❌ Bad - Template literal without sanitization
const prompt = `Process this data: ${externalDocument}`;
await openai.chat.completions.create({
  messages: [{ role: 'user', content: prompt }],
});

// ✅ Good - Parameterized prompt
const prompt = {
  system: 'You are a helpful assistant',
  user: sanitizeInput(userInput),
};

// ✅ Good - Using prompt injection guards
const safePrompt = promptGuard.sanitize(userInput);
await llm.complete(safePrompt);
```

---

## ASI02: Tool Misuse & Exploitation

> **Risk**: Agents misuse legitimate tools due to insufficient access controls and validation

### Detectable via ESLint

#### 🔴 Critical Priority

| Rule ID                              | Rule Name                                       | Description                                                     | CWE Mapping |
| ------------------------------------ | ----------------------------------------------- | --------------------------------------------------------------- | ----------- |
| `require-tool-permission-validation` | Enforce permission checks before tool execution | Requires validation of tool permissions before invocation       | CWE-862     |
| `no-unvalidated-tool-parameters`     | Require parameter validation for agent tools    | Enforces schema validation on tool arguments before execution   | CWE-20      |
| `require-tool-rate-limiting`         | Require rate limits on tool invocations         | Enforces rate limiting configuration for costly/dangerous tools | CWE-770     |

#### 🟠 High Priority

| Rule ID                                        | Rule Name                                    | Description                                                                   | CWE Mapping |
| ---------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------- | ----------- |
| `enforce-tool-least-privilege`                 | Enforce least privilege for tool definitions | Ensures tools declare minimal required permissions (read-only, scoped access) | CWE-250     |
| `require-human-approval-for-destructive-tools` | Require HITL for high-impact tools           | Enforces human-in-the-loop approval for delete/transfer/publish operations    | CWE-284     |
| `detect-tool-chaining-risks`                   | Detect unsafe tool chaining patterns         | Flags sequences like "internal query → external exfiltration"                 | CWE-668     |
| `no-auto-approved-tools-without-validation`    | Prevent auto-approval without validation     | Ensures auto-approved tools still have runtime validation                     | CWE-862     |

#### 🟡 Medium Priority

| Rule ID                         | Rule Name                                  | Description                                                     | CWE Mapping |
| ------------------------------- | ------------------------------------------ | --------------------------------------------------------------- | ----------- |
| `require-tool-egress-allowlist` | Require network egress controls for tools  | Enforces allowlist configuration for tools making network calls | CWE-923     |
| `enforce-tool-session-binding`  | Bind tool credentials to specific sessions | Prevents credential reuse across sessions/users                 | CWE-384     |

### Example Implementation: `require-tool-permission-validation`

```javascript
// ❌ Bad - Tool execution without permission check
async function executeTool(toolName, params) {
  return await tools[toolName].run(params);
}

// ❌ Bad - Missing parameter validation
agent.registerTool('sendEmail', async (to, subject, body) => {
  return await emailService.send(to, subject, body); // No validation
});

// ✅ Good - Permission check + validation
async function executeTool(toolName, params, context) {
  if (!hasPermission(context.user, toolName)) {
    throw new Error('Unauthorized tool access');
  }
  const validatedParams = validateToolParams(toolName, params);
  return await tools[toolName].run(validatedParams);
}

// ✅ Good - Least privilege tool definition
agent.registerTool('querySalesforce', {
  permissions: ['read:opportunity'], // Scoped, not "read:*"
  rateLimit: { maxCalls: 100, window: '1m' },
  validator: salesforceQuerySchema,
});
```

---

## ASI03: Identity & Privilege Abuse

> **Risk**: Exploiting dynamic trust and delegated permissions to escalate access

### Detectable via ESLint

#### 🔴 Critical Priority

| Rule ID                           | Rule Name                                       | Description                                                      | CWE Mapping |
| --------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- | ----------- |
| `no-hardcoded-agent-credentials`  | Prevent hardcoded API keys/tokens in agent code | Detects hardcoded secrets in agent configurations                | CWE-798     |
| `require-task-scoped-credentials` | Enforce task-scoped, short-lived credentials    | Requires credentials to be ephemeral and bound to specific tasks | CWE-287     |
| `no-credential-caching-in-memory` | Prevent credential caching in agent memory      | Flags storage of credentials in long-term memory/context         | CWE-522     |

#### 🟠 High Priority

| Rule ID                                    | Rule Name                                           | Description                                                | CWE Mapping |
| ------------------------------------------ | --------------------------------------------------- | ---------------------------------------------------------- | ----------- |
| `enforce-agent-identity-attestation`       | Require cryptographic identity attestation          | Ensures agents use mTLS/PKI for identity verification      | CWE-287     |
| `no-privilege-inheritance-without-scoping` | Prevent un-scoped privilege delegation              | Flags delegation without applying least-privilege filters  | CWE-269     |
| `require-per-action-authorization`         | Require re-authorization for each privileged action | Enforces authorization checks at every step, not just once | CWE-863     |

#### 🟡 Medium Priority

| Rule ID                             | Rule Name                                       | Description                                           | CWE Mapping |
| ----------------------------------- | ----------------------------------------------- | ----------------------------------------------------- | ----------- |
| `detect-toctou-in-agent-workflows`  | Detect Time-of-Check-Time-of-Use gaps           | Identifies permission checks separated from execution | CWE-367     |
| `require-intent-binding-for-tokens` | Require signed intent capsules for OAuth tokens | Ensures tokens are bound to specific intent/purpose   | CWE-863     |

### Example Implementation: `no-hardcoded-agent-credentials`

```javascript
// ❌ Bad - Hardcoded API key
const agent = new Agent({
  apiKey: 'sk-abc123def456...',
  model: 'gpt-4',
});

// ❌ Bad - Hardcoded in tool definition
agent.registerTool('queryDB', {
  connectionString: 'postgresql://user:password@host:5432/db',
});

// ✅ Good - Environment variable
const agent = new Agent({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4',
});

// ✅ Good - Short-lived credential from vault
const dbCredential = await vault.getTemporaryCredential({
  service: 'postgresql',
  ttl: 300, // 5 minutes
  scope: 'read:customers',
});
```

---

## ASI04: Agentic Supply Chain Vulnerabilities

> **Risk**: Malicious or compromised tools, plugins, prompts, or agents loaded at runtime

### Detectable via ESLint

#### 🔴 Critical Priority

| Rule ID                      | Rule Name                                      | Description                                                               | CWE Mapping |
| ---------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------- | ----------- |
| `require-signed-mcp-servers` | Require signature verification for MCP servers | Enforces cryptographic signature checks on Model Context Protocol servers | CWE-494     |
| `no-dynamic-tool-loading`    | Prevent runtime loading of unverified tools    | Flags dynamic imports/requires of agent tools without provenance checks   | CWE-494     |
| `require-dependency-pinning` | Require pinned versions for agent dependencies | Ensures prompts, tools, configs use commit hashes/content hashes          | CWE-829     |

#### 🟠 High Priority

| Rule ID                               | Rule Name                                       | Description                                                            | CWE Mapping |
| ------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------- | ----------- |
| `require-aibom-for-agents`            | Require AI Bill of Materials (AIBOM)            | Enforces AIBOM/SBOM generation for agent components                    | CWE-1357    |
| `detect-typosquatted-tools`           | Detect potential typosquatted tool names        | Warns on tool names similar to well-known tools (Levenshtein distance) | CWE-506     |
| `require-tool-provenance-attestation` | Require signed provenance for third-party tools | Enforces provenance metadata (author, registry, signature)             | CWE-494     |

#### 🟡 Medium Priority

| Rule ID                            | Rule Name                                    | Description                                               | CWE Mapping |
| ---------------------------------- | -------------------------------------------- | --------------------------------------------------------- | ----------- |
| `no-unsigned-prompt-templates`     | Prevent use of unsigned prompt templates     | Requires version control + peer review for prompt changes | CWE-494     |
| `require-agent-registry-allowlist` | Require curated registry for agent discovery | Enforces use of trusted registries only                   | CWE-829     |

### Example Implementation: `require-signed-mcp-servers`

```javascript
// ❌ Bad - Loading unverified MCP server
import { createMCPClient } from 'mcp-sdk';
const client = await createMCPClient('https://random-mcp-server.com');

// ❌ Bad - No signature verification
const tool = await loadTool('npm:shady-tool@latest');

// ✅ Good - Signature verification required
const client = await createMCPClient('https://trusted-mcp.com', {
  verifySignature: true,
  trustedPublicKeys: [process.env.MCP_PUBLIC_KEY],
});

// ✅ Good - Pinned with content hash
const tool = await loadTool('npm:@verified/tool@sha256:abc123...', {
  requireSignature: true,
  allowedRegistries: ['registry.npmjs.org'],
});
```

---

## ASI05: Unexpected Code Execution (RCE)

> **Risk**: Agents generate/execute code unsafely, leading to remote code execution

### Detectable via ESLint

#### 🔴 Critical Priority

| Rule ID                              | Rule Name                                | Description                                                          | CWE Mapping |
| ------------------------------------ | ---------------------------------------- | -------------------------------------------------------------------- | ----------- |
| `no-eval-in-production-agents`       | Ban eval() in production agent code      | Prohibits eval, Function constructor, vm.runInContext in production  | CWE-95      |
| `no-unsafe-code-generation`          | Prevent unsafe code generation patterns  | Detects code generation without validation gates                     | CWE-94      |
| `require-sandbox-for-code-execution` | Require sandboxed execution environments | Enforces use of sandboxes (containers, VMs) for agent-generated code | CWE-94      |

#### 🟠 High Priority

| Rule ID                               | Rule Name                                | Description                                                    | CWE Mapping |
| ------------------------------------- | ---------------------------------------- | -------------------------------------------------------------- | ----------- |
| `no-unsafe-deserialization-in-agents` | Prevent unsafe deserialization           | Flags deserialize/pickle/unmarshal on untrusted data           | CWE-502     |
| `require-code-validation-gate`        | Require validation before code execution | Enforces linting/static analysis before running generated code | CWE-94      |
| `no-shell-injection-in-tools`         | Prevent shell command injection in tools | Detects unsafe shell command construction                      | CWE-78      |

#### 🟡 Medium Priority

| Rule ID                                 | Rule Name                              | Description                                              | CWE Mapping |
| --------------------------------------- | -------------------------------------- | -------------------------------------------------------- | ----------- |
| `require-filesystem-isolation`          | Require filesystem access restrictions | Enforces working directory limits for code execution     | CWE-732     |
| `detect-dependency-confusion-in-agents` | Detect dependency confusion risks      | Flags unpinned dependencies in agent-generated lockfiles | CWE-427     |

### Example Implementation: `no-eval-in-production-agents`

```javascript
// ❌ Bad - Direct eval of agent output
const code = await agent.generateCode(userRequest);
eval(code); // Dangerous!

// ❌ Bad - Function constructor
const fn = new Function(agentGeneratedCode);
fn();

// ✅ Good - Sandboxed execution
const code = await agent.generateCode(userRequest);
await validateCode(code); // Static analysis
const result = await sandbox.run(code, {
  timeout: 5000,
  memory: '128MB',
  network: 'isolated',
});

// ✅ Good - Separate generation from execution
const code = await agent.generateCode(userRequest);
await saveToPendingReview(code); // Human review
// Execution only after approval
```

---

## ASI06: Memory & Context Poisoning

> **Risk**: Adversaries corrupt stored information (RAG, memory) to bias future reasoning

### Detectable via ESLint

#### 🔴 Critical Priority

| Rule ID                           | Rule Name                                       | Description                                                  | CWE Mapping |
| --------------------------------- | ----------------------------------------------- | ------------------------------------------------------------ | ----------- |
| `require-memory-input-validation` | Require validation before writing to memory     | Enforces content scanning before memory commits              | CWE-20      |
| `prevent-output-reingestion`      | Prevent automatic re-ingestion of agent outputs | Flags code that feeds agent outputs back into trusted memory | CWE-349     |
| `require-memory-segmentation`     | Require isolation between memory contexts       | Enforces per-user/per-task memory isolation                  | CWE-668     |

#### 🟠 High Priority

| Rule ID                              | Rule Name                                     | Description                                                   | CWE Mapping |
| ------------------------------------ | --------------------------------------------- | ------------------------------------------------------------- | ----------- |
| `require-memory-provenance-tracking` | Require source attribution for memory entries | Ensures stored data includes provenance metadata              | CWE-346     |
| `enforce-memory-ttl`                 | Require time-to-live for unverified memory    | Enforces expiration/decay for low-trust memory entries        | CWE-613     |
| `detect-cross-tenant-memory-bleed`   | Detect potential cross-tenant data leakage    | Flags shared vector stores without proper namespace isolation | CWE-668     |

#### 🟡 Medium Priority

| Rule ID                                | Rule Name                                       | Description                                         | CWE Mapping |
| -------------------------------------- | ----------------------------------------------- | --------------------------------------------------- | ----------- |
| `require-memory-encryption`            | Require encryption for sensitive memory         | Enforces encryption at rest for agent memory stores | CWE-311     |
| `require-anomaly-detection-for-memory` | Require monitoring for suspicious memory writes | Enforces behavioral monitoring on memory operations | CWE-778     |

### Example Implementation: `prevent-output-reingestion`

```javascript
// ❌ Bad - Feeding agent output back into memory
const response = await agent.complete(userQuery);
await agent.memory.store(response); // Self-reinforcing contamination

// ❌ Bad - No validation before RAG ingestion
const documents = await fetchExternalDocs(url);
await vectorDB.index(documents); // Could contain hidden prompts

// ✅ Good - Validation gate before storage
const response = await agent.complete(userQuery);
const sanitized = await contentValidator.scan(response, {
  checkForMaliciousInstructions: true,
  checkForSensitiveData: true,
});
if (sanitized.isSafe) {
  await agent.memory.store(response, {
    source: 'agent-generated',
    trustScore: 0.3, // Low trust
    ttl: '24h',
  });
}

// ✅ Good - Provenance + segmentation
await vectorDB.index(documents, {
  namespace: `user:${userId}`, // Isolated per user
  metadata: { source: url, verified: false },
});
```

---

## ASI07: Insecure Inter-Agent Communication

> **Risk**: Messages between agents lack authentication, integrity, or semantic validation

### Detectable via ESLint

#### 🔴 Critical Priority

| Rule ID                                 | Rule Name                                     | Description                                                | CWE Mapping |
| --------------------------------------- | --------------------------------------------- | ---------------------------------------------------------- | ----------- |
| `require-encrypted-agent-communication` | Require encryption for inter-agent messages   | Enforces mTLS or equivalent for agent-to-agent channels    | CWE-319     |
| `require-message-signing`               | Require digital signatures on agent messages  | Enforces cryptographic signing of inter-agent messages     | CWE-345     |
| `no-unvalidated-agent-messages`         | Require validation of incoming agent messages | Enforces schema + semantic validation on received messages | CWE-20      |

#### 🟠 High Priority

| Rule ID                              | Rule Name                                   | Description                                            | CWE Mapping |
| ------------------------------------ | ------------------------------------------- | ------------------------------------------------------ | ----------- |
| `enforce-mutual-authentication`      | Require mutual TLS for agent connections    | Enforces both client and server certificate validation | CWE-295     |
| `require-anti-replay-protection`     | Require nonces/timestamps to prevent replay | Enforces replay attack prevention in agent protocols   | CWE-294     |
| `detect-protocol-downgrade-attempts` | Detect weak/legacy protocol usage           | Flags attempts to use unencrypted or weak protocols    | CWE-757     |

#### 🟡 Medium Priority

| Rule ID                                  | Rule Name                                           | Description                                               | CWE Mapping |
| ---------------------------------------- | --------------------------------------------------- | --------------------------------------------------------- | ----------- |
| `require-agent-discovery-authentication` | Require authentication for agent discovery          | Enforces auth on service discovery/registration endpoints | CWE-306     |
| `enforce-message-padding`                | Require message padding to prevent traffic analysis | Implements fixed-size messages to reduce metadata leakage | CWE-200     |

### Example Implementation: `require-encrypted-agent-communication`

```javascript
// ❌ Bad - Unencrypted HTTP for agent communication
const agentClient = new AgentClient('http://other-agent:3000');
await agentClient.send({ task: 'process data' });

// ❌ Bad - No mutual authentication
const agentClient = new AgentClient('https://other-agent:3000', {
  rejectUnauthorized: false, // Dangerous!
});

// ✅ Good - mTLS with certificate pinning
const agentClient = new AgentClient('https://other-agent:3000', {
  tls: {
    ca: fs.readFileSync('/certs/ca.pem'),
    cert: fs.readFileSync('/certs/agent-client.pem'),
    key: fs.readFileSync('/certs/agent-client-key.pem'),
    checkServerIdentity: pinCertificate(expectedFingerprint),
  },
});

// ✅ Good - Signed messages with anti-replay
const message = {
  task: 'process data',
  nonce: crypto.randomBytes(16).toString('hex'),
  timestamp: Date.now(),
};
const signature = crypto.sign(
  'sha256',
  Buffer.from(JSON.stringify(message)),
  privateKey,
);
await agentClient.send({ ...message, signature });
```

---

## ASI08: Cascading Failures

> **Risk**: Single fault propagates across agents, compounding into system-wide harm

### Detectable via ESLint

#### 🔴 Critical Priority

| Rule ID                              | Rule Name                                             | Description                                             | CWE Mapping |
| ------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------- | ----------- |
| `require-circuit-breaker-pattern`    | Require circuit breakers between agents               | Enforces circuit breaker implementation for agent calls | CWE-755     |
| `require-execution-validation-gates` | Require validation gates before cross-agent execution | Enforces policy checks between planner and executor     | CWE-754     |
| `enforce-blast-radius-limits`        | Require quotas/caps on agent operations               | Enforces rate limits and progress caps per agent        | CWE-770     |

#### 🟠 High Priority

| Rule ID                              | Rule Name                               | Description                                                     | CWE Mapping |
| ------------------------------------ | --------------------------------------- | --------------------------------------------------------------- | ----------- |
| `require-agent-isolation-boundaries` | Require sandboxing/network segmentation | Enforces isolation config (namespaces, network policies)        | CWE-653     |
| `detect-feedback-loop-risks`         | Detect potential agent feedback loops   | Identifies circular dependencies in agent workflows             | CWE-834     |
| `require-independent-policy-engine`  | Require external policy validation      | Enforces separation of planning and execution via policy engine | CWE-693     |

#### 🟡 Medium Priority

| Rule ID                                  | Rule Name                           | Description                                               | CWE Mapping |
| ---------------------------------------- | ----------------------------------- | --------------------------------------------------------- | ----------- |
| `require-behavioral-baseline-monitoring` | Require anomaly detection baselines | Enforces establishment of behavioral baselines for agents | CWE-778     |
| `require-immutable-audit-logs`           | Require tamper-evident logging      | Enforces immutable, signed logs for agent actions         | CWE-778     |

### Example Implementation: `require-circuit-breaker-pattern`

```javascript
// ❌ Bad - No circuit breaker
async function callDownstreamAgent(request) {
  return await agentClient.send(request); // Can cascade failures
}

// ❌ Bad - No rate limiting
for (const task of tasks) {
  await executorAgent.execute(task); // Can overwhelm downstream
}

// ✅ Good - Circuit breaker with timeout
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(agentClient.send.bind(agentClient), {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});

breaker.fallback(() => ({ status: 'degraded', message: 'Agent unavailable' }));

async function callDownstreamAgent(request) {
  return await breaker.fire(request);
}

// ✅ Good - Rate limiting + validation gate
import rateLimit from 'express-rate-limit';

const executionLimiter = rateLimit({
  windowMs: 60000,
  max: 100, // Max 100 executions per minute
});

async function executeTask(task) {
  const approved = await policyEngine.validate(task);
  if (!approved) {
    throw new Error('Task failed policy validation');
  }
  return await executorAgent.execute(task);
}
```

---

## ASI09: Human-Agent Trust Exploitation

> **Risk**: Agent's fluency exploited to manipulate human decisions

### Detectable via ESLint

#### 🔴 Critical Priority

| Rule ID                                          | Rule Name                                  | Description                                                        | CWE Mapping |
| ------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------ | ----------- |
| `require-human-approval-for-sensitive-actions`   | Require HITL for high-impact actions       | Enforces human confirmation before destructive operations          | CWE-284     |
| `require-action-confirmation-ui`                 | Require explicit confirmation prompts      | Enforces multi-step approval UI for risky actions                  | CWE-862     |
| `prevent-auto-execution-of-sensitive-operations` | Prevent automatic execution without review | Flags code that auto-executes transfers, deletions, config changes | CWE-862     |

#### 🟠 High Priority

| Rule ID                           | Rule Name                                   | Description                                            | CWE Mapping |
| --------------------------------- | ------------------------------------------- | ------------------------------------------------------ | ----------- |
| `require-explainability-metadata` | Require non-LLM-generated explanations      | Enforces structured metadata for action rationales     | CWE-693     |
| `require-risk-scoring-ui`         | Require visual risk indicators              | Enforces display of risk scores/badges in UI           | CWE-693     |
| `detect-preview-side-effects`     | Detect side effects in "read-only" previews | Flags network/state-changing calls in preview contexts | CWE-668     |

#### 🟡 Medium Priority

| Rule ID                                    | Rule Name                                     | Description                                              | CWE Mapping |
| ------------------------------------------ | --------------------------------------------- | -------------------------------------------------------- | ----------- |
| `require-plan-divergence-detection`        | Require workflow baseline comparison          | Enforces comparison against approved workflow baselines  | CWE-754     |
| `require-manipulation-reporting-mechanism` | Require user reporting of suspicious behavior | Enforces UI for users to flag manipulative agent actions | CWE-693     |

### Example Implementation: `require-human-approval-for-sensitive-actions`

```javascript
// ❌ Bad - Auto-execution of fund transfer
async function transferFunds(to, amount) {
  if (agentRecommends({ action: 'transfer', to, amount })) {
    return await bankAPI.transfer(to, amount); // No human check!
  }
}

// ❌ Bad - Silent deletion
async function cleanupFiles(pattern) {
  const files = await agent.identifyObsoleteFiles(pattern);
  await fs.unlink(files); // Auto-deletes without confirmation
}

// ✅ Good - Explicit human approval required
async function transferFunds(to, amount, context) {
  const recommendation = await agentRecommends({
    action: 'transfer',
    to,
    amount,
  });

  const approval = await requestHumanApproval({
    action: 'transfer',
    risk: 'high',
    details: { to, amount },
    rationale: recommendation.reasoning, // Non-LLM metadata
    requireExplicitConsent: true,
    confirmationSteps: 2, // Multi-step
  });

  if (!approval.granted) {
    throw new Error('Transfer denied by human operator');
  }

  return await bankAPI.transfer(to, amount);
}

// ✅ Good - Preview without side effects
async function previewDataDeletion(pattern) {
  const files = await agent.identifyObsoleteFiles(pattern);

  // Read-only preview
  return {
    action: 'delete',
    preview: files,
    riskScore: calculateRiskScore(files),
    sideEffects: 'none', // Explicit declaration
  };
}

// Actual deletion requires separate approval
async function confirmAndDelete(filesList, approvalToken) {
  verifyApprovalToken(approvalToken);
  await fs.unlink(filesList);
}
```

---

## ASI10: Rogue Agents

> **Risk**: Malicious or compromised agents deviate from intended behavior

### Detectable via ESLint

#### 🔴 Critical Priority

| Rule ID                       | Rule Name                                  | Description                                                      | CWE Mapping |
| ----------------------------- | ------------------------------------------ | ---------------------------------------------------------------- | ----------- |
| `require-agent-attestation`   | Require cryptographic identity attestation | Enforces signed attestation of agent identity and capabilities   | CWE-346     |
| `require-behavioral-manifest` | Require signed behavioral manifests        | Enforces declaration of expected tools, goals, capabilities      | CWE-693     |
| `require-agent-kill-switch`   | Require emergency shutdown mechanism       | Enforces implementation of instant disable/revocation capability | CWE-703     |

#### 🟠 High Priority

| Rule ID                               | Rule Name                              | Description                                               | CWE Mapping |
| ------------------------------------- | -------------------------------------- | --------------------------------------------------------- | ----------- |
| `enforce-agent-behavioral-monitoring` | Require continuous behavior validation | Enforces monitoring for deviations from declared manifest | CWE-778     |
| `require-agent-sandbox-isolation`     | Require execution in trust zones       | Enforces containerized, isolated execution environments   | CWE-653     |
| `detect-agent-replication-attempts`   | Detect unauthorized self-replication   | Flags code that spawns new agent instances                | CWE-506     |

#### 🟡 Medium Priority

| Rule ID                               | Rule Name                                          | Description                                                | CWE Mapping |
| ------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------- | ----------- |
| `require-agent-quarantine-capability` | Require quarantine mechanism for suspicious agents | Enforces ability to isolate agents for forensic review     | CWE-754     |
| `require-watchdog-agents`             | Require peer validation agents                     | Enforces deployment of monitoring agents to validate peers | CWE-778     |
| `detect-collusion-patterns`           | Detect coordinated agent manipulation              | Identifies suspicious coordination between multiple agents | CWE-506     |

### Example Implementation: `require-behavioral-manifest`

```javascript
// ❌ Bad - Agent without behavioral declaration
const agent = new Agent({
  model: 'gpt-4',
  tools: loadAllTools(), // Unrestricted access
});

// ❌ Bad - No attestation or verification
await agentRegistry.deploy(agent);

// ✅ Good - Signed behavioral manifest
const manifest = {
  agentId: 'sales-assistant-v1.2',
  declaredCapabilities: ['query:salesforce:read', 'send:email:internal'],
  declaredTools: [
    'salesforce-query@sha256:abc123...',
    'email-sender@sha256:def456...',
  ],
  goalStatement: 'Assist with sales inquiries, provide CRM data',
  maxActionsPerSession: 50,
  networkEgress: ['salesforce.com', 'internal-smtp.company.com'],
  signature: '...', // Signed by issuer
};

const agent = new Agent({
  model: 'gpt-4',
  manifest: manifest,
  enforceManifest: true, // Runtime validation
});

// Verify before deployment
await agentRegistry.deploy(agent, {
  verifySignature: true,
  requiredIssuer: 'company-ai-team',
});

// ✅ Good - Continuous monitoring
agentMonitor.watch(agent, {
  alertOnDeviations: [
    'unapproved-tool-invocation',
    'excessive-action-rate',
    'unexpected-egress',
  ],
  killSwitchOnAnomaly: true,
});
```

---

## Implementation Roadmap

### Phase 1: Foundation (Q1 2026)

**Focus**: Critical rules with highest ROI and feasibility

1. **ASI01 - Prompt Injection Protection**
   - ✅ `no-unsafe-prompt-concatenation`
   - ✅ `no-unvalidated-llm-input`
   - ✅ `require-prompt-injection-guards`

2. **ASI05 - Code Execution Safety**
   - ✅ `no-eval-in-production-agents`
   - ✅ `no-unsafe-code-generation`
   - ✅ `require-sandbox-for-code-execution`

3. **ASI03 - Credential Management**
   - ✅ `no-hardcoded-agent-credentials`
   - ✅ `require-task-scoped-credentials`

### Phase 2: Tool & Communication Security (Q2 2026)

**Focus**: Agent-to-agent and tool interaction safety

4. **ASI02 - Tool Controls**
   - ✅ `require-tool-permission-validation`
   - ✅ `no-unvalidated-tool-parameters`
   - ✅ `enforce-tool-least-privilege`

5. **ASI07 - Inter-Agent Security**
   - ✅ `require-encrypted-agent-communication`
   - ✅ `require-message-signing`
   - ✅ `no-unvalidated-agent-messages`

### Phase 3: Supply Chain & Memory (Q3 2026)

**Focus**: Dependencies and persistent state security

6. **ASI04 - Supply Chain**
   - ✅ `require-signed-mcp-servers`
   - ✅ `no-dynamic-tool-loading`
   - ✅ `require-dependency-pinning`

7. **ASI06 - Memory Safety**
   - ✅ `require-memory-input-validation`
   - ✅ `prevent-output-reingestion`
   - ✅ `require-memory-segmentation`

### Phase 4: Resilience & Trust (Q4 2026)

**Focus**: Failure handling and human oversight

8. **ASI08 - Cascading Failures**
   - ✅ `require-circuit-breaker-pattern`
   - ✅ `require-execution-validation-gates`
   - ✅ `enforce-blast-radius-limits`

9. **ASI09 - Human Approval**
   - ✅ `require-human-approval-for-sensitive-actions`
   - ✅ `require-action-confirmation-ui`

10. **ASI10 - Rogue Agent Detection**
    - ✅ `require-agent-attestation`
    - ✅ `require-behavioral-manifest`

---

## Integration with Existing Security Standards

### Mapping to CWE (Common Weakness Enumeration)

| OWASP ASI | Primary CWE Mappings                                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| ASI01     | CWE-74 (Injection), CWE-20 (Input Validation), CWE-94 (Code Injection)                                                        |
| ASI02     | CWE-862 (Missing Authorization), CWE-250 (Execution with Unnecessary Privileges)                                              |
| ASI03     | CWE-287 (Improper Authentication), CWE-269 (Improper Privilege Management), CWE-798 (Hardcoded Credentials)                   |
| ASI04     | CWE-494 (Download of Code Without Integrity Check), CWE-829 (Inclusion of Functionality from Untrusted Control Sphere)        |
| ASI05     | CWE-95 (Eval Injection), CWE-94 (Code Injection), CWE-502 (Deserialization of Untrusted Data)                                 |
| ASI06     | CWE-20 (Input Validation), CWE-668 (Exposure of Resource to Wrong Sphere), CWE-349 (Acceptance of Extraneous Untrusted Data)  |
| ASI07     | CWE-319 (Cleartext Transmission), CWE-345 (Insufficient Verification of Data Authenticity), CWE-294 (Capture-replay)          |
| ASI08     | CWE-755 (Improper Exception Handling), CWE-770 (Allocation of Resources Without Limits), CWE-834 (Loop with Unreachable Exit) |
| ASI09     | CWE-284 (Improper Access Control), CWE-862 (Missing Authorization), CWE-693 (Protection Mechanism Failure)                    |
| ASI10     | CWE-346 (Origin Validation Error), CWE-506 (Embedded Malicious Code), CWE-778 (Insufficient Logging)                          |

### Mapping to OWASP LLM Top 10 (2025)

| OWASP ASI | Related LLM Top 10 Entries                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------ |
| ASI01     | LLM01:2025 Prompt Injection, LLM06:2025 Excessive Agency                                                                 |
| ASI02     | LLM06:2025 Excessive Agency                                                                                              |
| ASI03     | LLM01:2025 Prompt Injection, LLM02:2025 Sensitive Information Disclosure, LLM06:2025 Excessive Agency                    |
| ASI04     | LLM03:2025 Supply Chain Vulnerabilities                                                                                  |
| ASI05     | LLM01:2025 Prompt Injection, LLM05:2025 Improper Output Handling                                                         |
| ASI06     | LLM01:2025 Prompt Injection, LLM04:2025 Data and Model Poisoning, LLM08:2025 Vector and Embedding Weaknesses             |
| ASI07     | LLM02:2025 Sensitive Information Disclosure, LLM06:2025 Excessive Agency                                                 |
| ASI08     | LLM01:2025 Prompt Injection, LLM04:2025 Data and Model Poisoning, LLM06:2025 Excessive Agency                            |
| ASI09     | LLM01:2025 Prompt Injection, LLM05:2025 Improper Output Handling, LLM06:2025 Excessive Agency, LLM09:2025 Misinformation |
| ASI10     | LLM02:2025 Sensitive Information Disclosure, LLM09:2025 Misinformation                                                   |

---

## ESLint Plugin Configuration Example

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['@secure-coding/agentic-security'],
  rules: {
    // ASI01: Agent Goal Hijack
    '@secure-coding/agentic-security/no-unsafe-prompt-concatenation': 'error',
    '@secure-coding/agentic-security/no-unvalidated-llm-input': 'error',
    '@secure-coding/agentic-security/require-prompt-injection-guards': 'warn',

    // ASI02: Tool Misuse
    '@secure-coding/agentic-security/require-tool-permission-validation':
      'error',
    '@secure-coding/agentic-security/no-unvalidated-tool-parameters': 'error',
    '@secure-coding/agentic-security/enforce-tool-least-privilege': 'warn',

    // ASI03: Identity & Privilege Abuse
    '@secure-coding/agentic-security/no-hardcoded-agent-credentials': 'error',
    '@secure-coding/agentic-security/require-task-scoped-credentials': 'error',

    // ASI04: Supply Chain
    '@secure-coding/agentic-security/require-signed-mcp-servers': 'error',
    '@secure-coding/agentic-security/no-dynamic-tool-loading': 'error',

    // ASI05: Code Execution
    '@secure-coding/agentic-security/no-eval-in-production-agents': 'error',
    '@secure-coding/agentic-security/require-sandbox-for-code-execution':
      'error',

    // ASI06: Memory Poisoning
    '@secure-coding/agentic-security/require-memory-input-validation': 'error',
    '@secure-coding/agentic-security/prevent-output-reingestion': 'warn',

    // ASI07: Inter-Agent Communication
    '@secure-coding/agentic-security/require-encrypted-agent-communication':
      'error',
    '@secure-coding/agentic-security/require-message-signing': 'error',

    // ASI08: Cascading Failures
    '@secure-coding/agentic-security/require-circuit-breaker-pattern': 'warn',
    '@secure-coding/agentic-security/enforce-blast-radius-limits': 'warn',

    // ASI09: Human-Agent Trust
    '@secure-coding/agentic-security/require-human-approval-for-sensitive-actions':
      'error',

    // ASI10: Rogue Agents
    '@secure-coding/agentic-security/require-agent-attestation': 'error',
    '@secure-coding/agentic-security/require-behavioral-manifest': 'warn',
  },
};
```

---

## Testing Strategy

### Unit Tests

Each rule must have comprehensive test coverage including:

- **Valid cases**: Code that should not trigger the rule
- **Invalid cases**: Code that should trigger warnings/errors
- **Edge cases**: Complex scenarios, partial matches, framework-specific patterns

### Integration Tests

- Test rules against real-world agentic frameworks:
  - LangChain
  - AutoGPT
  - LlamaIndex
  - Semantic Kernel
  - CrewAI
  - Microsoft Autogen

### Continuous Validation

- Weekly scans of public AI agent repositories
- Track false positive/negative rates
- Community feedback integration

---

## Success Metrics

### Adoption Metrics

- Downloads of `eslint-plugin-secure-coding` (agentic rules)
- GitHub stars and forks
- Integration into major agentic frameworks' official templates

### Detection Metrics

- Number of vulnerabilities detected in production codebases
- Critical severity issues prevented
- Mean time to detection (compared to runtime/penetration testing)

### Quality Metrics

- False positive rate < 5%
- False negative rate < 10% (validated against known exploits)
- Developer satisfaction score > 4/5

---

## Contributing Guidelines

### Rule Development Process

1. **Propose**: Create issue with OWASP ASI mapping, CWE reference, examples
2. **Design**: Peer review of detection logic, discuss edge cases
3. **Implement**: Create rule following ESLint best practices
4. **Test**: Achieve 100% code coverage + real-world validation
5. **Document**: Write clear documentation with examples
6. **Release**: Semantic versioning, changelog, migration guide

### Community Engagement

- Monthly office hours for contributors
- Quarterly security researcher summits
- Bug bounty program for false negatives

---

## References

1. **OWASP Top 10 for Agentic Applications 2026**
   - https://owasp.org/www-project-top-10-for-agentic-applications/

2. **OWASP Top 10 for LLM Applications 2025**
   - https://genai.owasp.org/llm-top-10/

3. **OWASP AI Security and Privacy Guide**
   - https://owasp.org/www-project-ai-security-and-privacy-guide/

4. **CWE - Common Weakness Enumeration**
   - https://cwe.mitre.org/

5. **NIST AI Risk Management Framework**
   - https://www.nist.gov/itl/ai-risk-management-framework

6. **OWASP AIVSS (AI Vulnerability Scoring System)**
   - https://owasp.org/www-project-ai-security-and-privacy-guide/

---

## Appendix: Quick Reference Matrix

| Priority    | ASI Entry | Top 3 Rules                                                                                               | Estimated Effort |
| ----------- | --------- | --------------------------------------------------------------------------------------------------------- | ---------------- |
| 🔴 Critical | ASI01     | no-unsafe-prompt-concatenation, no-unvalidated-llm-input, require-prompt-injection-guards                 | 3 weeks          |
| 🔴 Critical | ASI05     | no-eval-in-production-agents, require-sandbox-for-code-execution, no-unsafe-code-generation               | 2 weeks          |
| 🔴 Critical | ASI03     | no-hardcoded-agent-credentials, require-task-scoped-credentials, no-credential-caching-in-memory          | 2 weeks          |
| 🟠 High     | ASI02     | require-tool-permission-validation, no-unvalidated-tool-parameters, enforce-tool-least-privilege          | 4 weeks          |
| 🟠 High     | ASI07     | require-encrypted-agent-communication, require-message-signing, enforce-mutual-authentication             | 3 weeks          |
| 🟠 High     | ASI04     | require-signed-mcp-servers, no-dynamic-tool-loading, require-dependency-pinning                           | 3 weeks          |
| 🟡 Medium   | ASI06     | require-memory-input-validation, prevent-output-reingestion, require-memory-segmentation                  | 3 weeks          |
| 🟡 Medium   | ASI08     | require-circuit-breaker-pattern, require-execution-validation-gates, enforce-blast-radius-limits          | 4 weeks          |
| 🟡 Medium   | ASI09     | require-human-approval-for-sensitive-actions, require-action-confirmation-ui, detect-preview-side-effects | 2 weeks          |
| 🟡 Medium   | ASI10     | require-agent-attestation, require-behavioral-manifest, enforce-agent-behavioral-monitoring               | 4 weeks          |

**Total Estimated Effort**: ~30 weeks (7.5 months) for all critical and high-priority rules

---

## License

This roadmap is released under the same license as the OWASP Top 10 for Agentic Applications: **Creative Commons CC BY-SA 4.0**

---

**Document Version**: 1.0  
**Last Updated**: December 12, 2025  
**Maintained by**: ESLint Secure Coding Team  
**Contact**: ofriperetz.dev@gmail.com
