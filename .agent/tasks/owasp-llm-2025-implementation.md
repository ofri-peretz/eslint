# OWASP LLM Top 10 2025 - ESLint Rules Implementation Plan

## Overview

Implementing 40 new ESLint security rules based on OWASP LLM Top 10 2025

## Rules by Category

### LLM01: Prompt Injection (7 rules)

#### 🔴 Critical Priority (4 rules)

- [x] `no-unsafe-prompt-concatenation` - Detects direct concatenation of user input into LLM prompts
- [ ] `require-prompt-template-parameterization` - Enforces use of structured templates
- [ ] `no-dynamic-system-prompts` - Prevents runtime modification of system prompts
- [ ] `detect-indirect-prompt-injection-vectors` - Identifies code where external content reaches LLM

#### 🟠 High Priority (3 rules)

- [ ] `require-input-sanitization-for-llm` - Enforces sanitization on LLM inputs
- [ ] `detect-rag-injection-risks` - Flags RAG/document inputs without scanning
- [ ] `no-user-controlled-prompt-instructions` - Flags user input controlling LLM behavior

### LLM02: Sensitive Information Disclosure (4 rules)

#### 🔴 Critical Priority (4 rules)

- [ ] `no-pii-in-llm-training-data` - Detects PII in fine-tuning APIs
- [ ] `require-llm-output-redaction` - Enforces redaction of LLM responses
- [ ] `no-credentials-in-llm-context` - Flags credentials in LLM context/memory
- [ ] `detect-overly-permissive-llm-data-access` - Identifies LLM tools with excessive access

### LLM03: Supply Chain Vulnerabilities (4 rules)

#### 🔴 Critical Priority (4 rules)

- [ ] `require-model-provenance-verification` - Enforces verification of model origins
- [ ] `no-unverified-model-downloads` - Flags dynamic model loading without verification
- [ ] `require-training-data-validation` - Enforces dataset validation before fine-tuning
- [ ] `detect-model-serving-infrastructure-risks` - Identifies unsafe model deployment

### LLM04: Data and Model Poisoning (4 rules)

#### 🔴 Critical Priority (4 rules)

- [ ] `require-training-data-provenance` - Enforces metadata tracking for datasets
- [ ] `detect-user-supplied-training-data` - Flags user content in training sets
- [ ] `no-auto-model-retraining-on-user-feedback` - Requires human review for updates
- [ ] `require-training-data-integrity-checks` - Enforces hash verification

### LLM05: Improper Output Handling (4 rules)

#### 🔴 Critical Priority (4 rules)

- [ ] `require-llm-output-validation` - Requires validation before using LLM responses
- [ ] `no-direct-llm-output-execution` - Flags eval/exec with LLM-generated code
- [ ] `require-llm-output-encoding` - Enforces encoding based on context
- [ ] `detect-llm-generated-sql` - Identifies dangerous LLM-to-SQL patterns

### LLM06: Excessive Agency (4 rules)

#### 🔴 Critical Priority (4 rules)

- [ ] `enforce-llm-tool-least-privilege` - Ensures tools have minimal permissions
- [ ] `require-human-approval-for-critical-actions` - Requires confirmation for critical actions
- [ ] `no-auto-approved-llm-tools` - Flags tools that auto-execute
- [ ] `detect-llm-unrestricted-tool-access` - Identifies LLM agents with access to all tools

### LLM07: System Prompt Leakage (3 rules)

#### 🔴 Critical Priority (3 rules)

- [ ] `no-system-prompt-in-output` - Detects code echoing system prompts
- [ ] `require-system-prompt-isolation` - Ensures system prompts aren't accessible
- [ ] `detect-prompt-extraction-vulnerabilities` - Identifies patterns revealing instructions

### LLM08: Vector and Embedding Weaknesses (4 rules)

#### 🔴 Critical Priority (4 rules)

- [ ] `require-vector-db-access-control` - Requires auth for vector DB operations
- [ ] `detect-embedding-poisoning-risks` - Identifies untrusted embedding inputs
- [ ] `require-vector-namespace-isolation` - Requires multi-tenant separation
- [ ] `no-unvalidated-embeddings` - Requires validation before storage/retrieval

### LLM09: Misinformation (3 rules)

#### 🟡 Medium Priority (3 rules)

- [ ] `require-llm-fact-checking` - Requires fact-checking mechanisms
- [ ] `require-llm-confidence-scoring` - Enforces confidence scores
- [ ] `detect-unverified-llm-assertions` - Flags LLM outputs used as facts

### LLM10: Unbounded Consumption (3 rules)

#### 🔴 Critical Priority (3 rules)

- [ ] `require-llm-rate-limiting` - Enforces rate limiting for LLM APIs
- [ ] `require-llm-token-budget` - Requires token usage caps
- [ ] `detect-llm-infinite-loops` - Identifies potential infinite reasoning loops

## Implementation Status

- Total Rules: 40
- Completed: 0
- In Progress: 0
- Remaining: 40

## Next Steps

1. Start with LLM01 (Prompt Injection) - highest impact
2. Implement LLM05 (Improper Output Handling) - overlaps with existing rules
3. Continue with LLM06 (Excessive Agency) - critical for agentic systems
4. Implement remaining categories in priority order
