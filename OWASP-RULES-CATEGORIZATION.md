# OWASP Roadmap Analysis: Rule Categorization

## Analysis of 145 Rules from OWASP Unified Roadmap

### Category 1: **`eslint-plugin-agentic-security`** (Generic Agentic Rules)

_Framework-agnostic agentic AI patterns that can be verified statically_

#### From LLM01: Prompt Injection (6 rules → agentic)

✅ **Move to agentic-security:**

1. `no-unsafe-prompt-concatenation` - Detects string concat in prompts
2. `require-prompt-template-parameterization` - Enforces structured templates
3. `no-dynamic-system-prompts` - Prevents runtime system prompt modification
4. `detect-indirect-prompt-injection-vectors` - Identifies external content reaching LLM
5. `detect-rag-injection-risks` - Flags RAG/document inputs without scanning
6. `no-user-controlled-prompt-instructions` - Detects user input controlling LLM behavior

❌ **DROP (unverifiable):** 7. `require-input-sanitization-for-llm` - Cannot verify sanitization effectiveness

---

#### From LLM05: Improper Output Handling (2 rules → agentic)

✅ **Move to agentic-security:**

1. `no-direct-llm-output-execution` - Detects eval()/child_process with LLM output
2. `detect-llm-generated-sql` - Identifies LLM output used in SQL

❌ **DROP (unverifiable):** 3. `require-llm-output-validation` - Cannot verify validation effectiveness 4. `require-llm-output-encoding` - Too context-dependent, covered by existing rules

---

#### From LLM06: Excessive Agency (4 rules → agentic)

✅ **Move to agentic-security:**

1. `enforce-llm-tool-least-privilege` - Ensures tools have minimal permissions
2. `require-human-approval-for-critical-actions` - Requires confirmation for destructive actions
3. `no-auto-approved-llm-tools` - Flags tools that auto-execute
4. `detect-llm-unrestricted-tool-access` - Identifies agents with access to all tools

---

#### From LLM07: System Prompt Leakage (3 rules → agentic)

✅ **Move to agentic-security:**

1. `no-system-prompt-in-output` - Detects code echoing system prompts
2. `require-system-prompt-isolation` - Ensures prompts aren't query-accessible
3. `detect-prompt-extraction-vulnerabilities` - Identifies patterns revealing instructions

---

#### From LLM08: Vector and Embedding Weaknesses (4 rules → agentic)

✅ **Move to agentic-security:**

1. `require-vector-db-access-control` - Requires auth for vector DB operations
2. `detect-embedding-poisoning-risks` - Identifies untrusted embedding inputs
3. `require-vector-namespace-isolation` - Requires multi-tenant separation
4. `no-unvalidated-embeddings` - Requires embedding validation

---

#### From LLM09: Misinformation (3 rules → agentic)

⚠️ **Consider for agentic-security (limited verifiability):**

1. `require-llm-fact-checking` - Requires fact-checking mechanisms
2. `require-llm-confidence-scoring` - Enforces confidence scores
3. `detect-unverified-llm-assertions` - Flags LLM outputs used as facts

---

#### From LLM10: Unbounded Consumption (1 rule → agentic)

✅ **Move to agentic-security:**

1. `detect-llm-infinite-loops` - Identifies potential infinite reasoning loops

❌ **DROP (SDK-specific, not verifiable):** 2. `require-llm-rate-limiting` - Implementation-specific 3. `require-llm-token-budget` - SDK-specific (move to SDK plugins)

---

#### From ASI01: Agent Goal Hijack (3 rules → agentic)

✅ **Move to agentic-security:**

1. `no-unsafe-agent-goal-setting` - Prevents user-controlled goal modification
2. `require-goal-validation-gate` - Enforces validation before goal changes
3. `detect-goal-manipulation-vectors` - Identifies indirect goal injection

---

#### From ASI02: Tool Misuse & Exploitation (4 rules → agentic)

✅ **Move to agentic-security:**

1. `require-tool-permission-validation` - Requires validation before tool invocation
2. `no-unvalidated-tool-parameters` - Enforces schema validation on tool arguments
3. `require-tool-rate-limiting` - Enforces rate limiting for tools
4. `enforce-tool-least-privilege` - Ensures minimal tool permissions

---

#### From ASI03: Identity & Privilege Abuse (4 rules → agentic)

✅ **Move to agentic-security:**

1. `no-hardcoded-agent-credentials` - Detects hardcoded secrets in agent configs
2. `require-task-scoped-credentials` - Enforces ephemeral credentials
3. `no-credential-caching-in-memory` - Flags credential storage in long-term memory
4. `no-privilege-inheritance-without-scoping` - Flags delegation without least-privilege

---

#### From ASI04: Agentic Supply Chain (4 rules → agentic)

✅ **Move to agentic-security:**

1. `require-signed-mcp-servers` - Enforces signature checks on MCP servers
2. `no-dynamic-tool-loading` - Flags dynamic tool imports without provenance
3. `require-dependency-pinning` - Ensures tools/configs use commit hashes
4. `require-aibom-for-agents` - Enforces AIBOM/SBOM generation

---

#### From ASI05: Unexpected Code Execution (4 rules → agentic)

✅ **Move to agentic-security:**

1. `no-eval-in-production-agents` - Prohibits eval/Function constructor
2. `no-unsafe-code-generation` - Detects code generation without validation
3. `require-sandbox-for-code-execution` - Enforces sandboxed environments
4. `no-unsafe-deserialization-in-agents` - Flags deserialize on untrusted data

---

#### From ASI06: Memory & Context Poisoning (4 rules → agentic)

✅ **Move to agentic-security:**

1. `require-memory-input-validation` - Enforces content scanning before memory commits
2. `prevent-output-reingestion` - Flags feeding agent outputs back into memory
3. `require-memory-segmentation` - Enforces per-user/per-task isolation
4. `require-memory-provenance-tracking` - Ensures stored data has provenance metadata

---

#### From ASI07: Insecure Inter-Agent Communication (4 rules → agentic)

✅ **Move to agentic-security:**

1. `require-encrypted-agent-communication` - Enforces mTLS for agent-to-agent
2. `require-message-signing` - Enforces cryptographic signing
3. `no-unvalidated-agent-messages` - Enforces schema validation on messages
4. `enforce-mutual-authentication` - Requires client and server cert validation

---

#### From ASI08: Cascading Failures (3 rules → agentic)

✅ **Move to agentic-security:**

1. `require-circuit-breaker-pattern` - Enforces circuit breaker for agent calls
2. `require-execution-validation-gates` - Enforces policy checks between planner/executor
3. `enforce-blast-radius-limits` - Requires rate limits and progress caps

---

#### From ASI09: Human-Agent Trust Exploitation (3 rules → agentic)

✅ **Move to agentic-security:**

1. `require-human-approval-for-sensitive-actions` - Enforces confirmation for destructive ops
2. `require-action-confirmation-ui` - Enforces multi-step approval UI
3. `prevent-auto-execution-of-sensitive-operations` - Flags auto-execution of risky actions

---

#### From ASI10: Rogue Agents (3 rules → agentic)

✅ **Move to agentic-security:**

1. `require-agent-attestation` - Enforces cryptographic identity attestation
2. `require-behavioral-manifest` - Enforces declaration of tools/goals/capabilities
3. `require-agent-kill-switch` - Enforces instant disable capability

---

### **Total for `eslint-plugin-agentic-security`: 57 rules**

---

## Category 2: **`eslint-plugin-secure-coding`** (General Code Security)

_Traditional web/backend security rules NOT related to LLMs/agents_

### Existing Rules to KEEP in secure-coding (48 rules)

#### Injection Prevention (11 rules)

1. `no-sql-injection` - SQL injection detection
2. `database-injection` - Database injection patterns
3. `detect-eval-with-expression` - eval() usage detection
4. `detect-child-process` - Shell command injection
5. `no-unsafe-dynamic-require` - Dynamic require() patterns
6. `no-graphql-injection` - GraphQL injection
7. `no-xxe-injection` - XML external entity injection
8. `no-xpath-injection` - XPath injection
9. `no-ldap-injection` - LDAP injection
10. `no-directive-injection` - Template/directive injection
11. `no-format-string-injection` - Format string vulnerabilities

#### Path & File Security (3 rules)

12. `detect-non-literal-fs-filename` - Path traversal detection
13. `no-zip-slip` - Zip extraction vulnerabilities
14. `no-toctou-vulnerability` - Time-of-check/time-of-use races

#### Regex Security (3 rules)

15. `detect-non-literal-regexp` - Dynamic regex patterns
16. `no-redos-vulnerable-regex` - ReDoS detection
17. `no-unsafe-regex-construction` - Unsafe regex building

#### Object & Prototype Security (2 rules)

18. `detect-object-injection` - Prototype pollution
19. `no-unsafe-deserialization` - Unsafe deserialization

#### Credentials & Cryptography (6 rules)

20. `no-hardcoded-credentials` - Hardcoded secrets detection
21. `no-weak-crypto` - Weak cryptographic algorithms
22. `no-insufficient-random` - Weak random number generation
23. `no-timing-attack` - Timing attack vulnerabilities
24. `no-insecure-comparison` - Unsafe string comparison
25. `no-insecure-jwt` - JWT security issues

#### Input Validation & XSS (5 rules)

26. `no-unvalidated-user-input` - Missing input validation
27. `no-unsanitized-html` - XSS via innerHTML/dangerouslySetInnerHTML
28. `no-unescaped-url-parameter` - URL parameter injection
29. `no-improper-sanitization` - Ineffective sanitization
30. `no-improper-type-validation` - Type confusion vulnerabilities

#### Authentication & Authorization (3 rules)

31. `no-missing-authentication` - Missing auth checks
32. `no-privilege-escalation` - Privilege escalation patterns
33. `no-weak-password-recovery` - Insecure password recovery

#### Session & Cookies (3 rules)

34. `no-insecure-cookie-settings` - Insecure cookie configuration
35. `no-missing-csrf-protection` - Missing CSRF protection
36. `no-document-cookie` - Direct document.cookie access

#### Network & Headers (5 rules)

37. `no-missing-cors-check` - Missing CORS validation
38. `no-missing-security-headers` - Missing security headers
39. `no-insecure-redirects` - Open redirect vulnerabilities
40. `no-unencrypted-transmission` - Cleartext transmission
41. `no-clickjacking` - Missing clickjacking protection

#### Data Exposure (2 rules)

42. `no-exposed-sensitive-data` - Sensitive data exposure
43. `no-sensitive-data-exposure` - Data leakage patterns

#### Buffer & Memory (1 rule)

44. `no-buffer-overread` - Buffer overread vulnerabilities

#### Resource & DoS (2 rules)

45. `no-unlimited-resource-allocation` - Resource exhaustion
46. `no-unchecked-loop-condition` - Infinite loop detection

#### Platform Specific (2 rules)

47. `no-electron-security-issues` - Electron-specific security
48. `no-insufficient-postmessage-validation` - postMessage validation

---

### NEW Rules to ADD to secure-coding (40 rules from roadmap)

#### From LLM02: Sensitive Information Disclosure (4 rules)

1. `no-pii-in-llm-training-data` - ⚠️ **RECONSIDER**: LLM-specific, might belong in agentic-security
2. `require-llm-output-redaction` - ⚠️ **RECONSIDER**: LLM-specific
3. `no-credentials-in-llm-context` - ⚠️ **RECONSIDER**: LLM-specific (→ agentic-security)
4. `detect-overly-permissive-llm-data-access` - ⚠️ **RECONSIDER**: LLM-specific (→ agentic-security)

**Recommendation: Move all 4 to agentic-security**

---

#### From LLM03: Supply Chain (4 rules)

⚠️ **RECONSIDER - These are LLM/Model-specific:**

1. `require-model-provenance-verification` - Model-specific (→ agentic-security)
2. `no-unverified-model-downloads` - Model-specific (→ agentic-security)
3. `require-training-data-validation` - Model-specific (→ agentic-security)
4. `detect-model-serving-infrastructure-risks` - Model-specific (→ agentic-security)

**Recommendation: Move all 4 to agentic-security**

---

#### From LLM04: Data and Model Poisoning (4 rules)

⚠️ **RECONSIDER - All are model/training-specific:**

1. `require-training-data-provenance` - (→ agentic-security)
2. `detect-user-supplied-training-data` - (→ agentic-security)
3. `no-auto-model-retraining-on-user-feedback` - (→ agentic-security)
4. `require-training-data-integrity-checks` - (→ agentic-security)

**Recommendation: Move all 4 to agentic-security**

---

#### From Mobile Security (28 rules - KEEP in secure-coding)

##### M1: Improper Credential Usage (4 rules)

✅ **Keep in secure-coding:**

1. `require-keychain-for-credentials` (iOS-specific)
2. `require-android-keystore` (Android-specific)
3. `no-credentials-in-shared-preferences` (Mobile-specific)
4. `require-biometric-protection` (Mobile-specific)

##### M2: Supply Chain (4 rules)

✅ **Keep in secure-coding:** 5. `require-sbom-generation` 6. `require-dependency-scanning` 7. `detect-typosquatted-dependencies` 8. `require-dependency-version-pinning`

##### M3: Authentication/Authorization (4 rules)

✅ **Keep in secure-coding:** 9. `require-server-side-authorization` 10. `require-oauth-pkce` 11. `no-client-side-session-management` 12. `require-biometric-authentication`

##### M4: Input/Output Validation (3 rules)

✅ **Keep in secure-coding:** 13. `require-webview-sanitization` 14. `no-javascript-bridge-without-validation` 15. `require-file-upload-validation`

##### M5: Insecure Communication (5 rules)

✅ **Keep in secure-coding:** 16. `require-tls-1-3` 17. `require-certificate-pinning` 18. `no-cleartext-traffic` 19. `require-ats-compliance` (iOS) 20. `require-network-security-config` (Android)

##### M6: Privacy Controls (4 rules)

✅ **Keep in secure-coding:** 21. `require-privacy-manifest` 22. `detect-excessive-permissions` 23. `require-consent-management` 24. `no-pii-in-analytics`

##### M7: Binary Protections (4 rules)

✅ **Keep in secure-coding:** 25. `require-code-obfuscation` 26. `no-debuggable-production-build` 27. `require-root-jailbreak-detection` 28. `require-anti-tampering`

##### M8: Security Misconfiguration (4 rules)

✅ **Keep in secure-coding:** 29. `no-verbose-logging-production` 30. `require-backup-exclusion` 31. `no-exported-components-without-permission` 32. `require-secure-webview-config`

##### M9: Insecure Data Storage (4 rules)

✅ **Keep in secure-coding:** 33. `require-encrypted-storage` 34. `no-sensitive-data-in-cache` 35. `require-sqlcipher-for-db` 36. `no-sensitive-data-in-temp-files`

##### M10: Cryptography (4 rules)

✅ **Keep in secure-coding:** 37. `no-deprecated-crypto-algorithms` 38. `require-secure-random` 39. `no-hardcoded-crypto-keys` 40. `require-authenticated-encryption`

---

## Category 3: **Drop Completely** (Unverifiable Rules)

### From LLM Rules (5 rules to DROP)

❌ 1. `require-input-sanitization-for-llm` - Cannot verify sanitization
❌ 2. `require-llm-output-validation` - Cannot verify validation
❌ 3. `require-llm-output-encoding` - Too context-dependent
❌ 4. `require-llm-rate-limiting` - Not statically verifiable
❌ 5. `require-llm-token-budget` - SDK-specific (recreate in SDK plugins)

---

## Summary

### Final Distribution:

| Plugin                               | Rule Count   | Categories                                       |
| ------------------------------------ | ------------ | ------------------------------------------------ |
| **`eslint-plugin-agentic-security`** | **69 rules** | LLM security (23) + Agentic security (46)        |
| **`eslint-plugin-secure-coding`**    | **88 rules** | Existing (48) + Mobile security (40)             |
| **SDK-Specific Plugins**             | **3 rules**  | Token budget rules for OpenAI, Anthropic, Google |
| **DROP**                             | **5 rules**  | Unverifiable patterns                            |

### Key Insights:

1. **LLM02-LLM04 rules** (12 rules) should move to **agentic-security**, not secure-coding
   - They're model/training-specific, not general code security

2. **Mobile rules** (40 rules) belong in **secure-coding**
   - They're platform-specific code security, not AI/agent-related

3. **All agentic patterns** (46 rules from ASI01-ASI10) go to **agentic-security**

4. **Token budget** becomes 3 SDK-specific rules:
   - `openai-security/require-max-tokens`
   - `anthropic-security/require-max-tokens`
   - `google-ai-security/require-max-output-tokens`

Would you like me to create migration scripts to move these rules to their correct locations?
