# Agentic SDK-Specific ESLint Plugins Roadmap

> **Vision**: SDK-aware ESLint security plugins with full API knowledge

## Why SDK-Specific Plugins?

Each AI/LLM SDK has unique APIs, types, and patterns:

```typescript
// OpenAI SDK v4
await openai.chat.completions.create({
  messages: [{ role: 'user', content: prompt }],
  max_tokens: 1000,
  functions: [...],
});

// Anthropic SDK
await anthropic.messages.create({
  messages: [{ role: 'user', content: prompt }],
  max_tokens: 1024,
  tools: [...],
});

// LangChain.js
const chain = new LLMChain({ llm, prompt });
await chain.invoke({ input: userInput });

// Vercel AI SDK
await generateText({
  model: openai('gpt-4'),
  prompt: userPrompt,
  tools: { ... },
});
```

**Generic pattern matching fails.** SDK-specific plugins succeed.

---

## Phase 1: High-Priority SDKs (Q1 2025)

### 1. eslint-plugin-openai-security

**Target**: OpenAI SDK (`openai` npm package)
**Weekly Downloads**: ~2.5M

#### Rules

| Rule                                      | OWASP | Description                                            |
| ----------------------------------------- | ----- | ------------------------------------------------------ |
| `openai/no-unsafe-message-content`        | LLM01 | Prevent prompt injection in ChatCompletionMessageParam |
| `openai/require-max-tokens`               | LLM10 | Require max_tokens in API calls                        |
| `openai/validate-function-args`           | LLM06 | Validate function call arguments                       |
| `openai/sanitize-completion-output`       | LLM05 | Sanitize ChatCompletion response content               |
| `openai/no-eval-completion`               | LLM05 | Prevent eval() on completion content                   |
| `openai/validate-image-generation-prompt` | LLM01 | Validate DALL-E prompts                                |
| `openai/require-moderation-check`         | LLM02 | Require moderation API for user input                  |

#### Configuration Example

```javascript
// eslint.config.js
import openaiSecurity from 'eslint-plugin-openai-security';

export default [
  openaiSecurity.configs.recommended,
  {
    rules: {
      'openai/require-max-tokens': ['error', { default: 4096 }],
    },
  },
];
```

---

### 2. eslint-plugin-langchain-security

**Target**: LangChain.js (`langchain`, `@langchain/core`)
**Weekly Downloads**: ~300K

#### Rules

| Rule                                        | OWASP | Description                             |
| ------------------------------------------- | ----- | --------------------------------------- |
| `langchain/no-unsafe-prompt-template`       | LLM01 | Validate PromptTemplate input variables |
| `langchain/require-retriever-sanitization`  | LLM01 | Sanitize RAG retriever outputs          |
| `langchain/validate-tool-input`             | LLM06 | Validate Tool input schemas             |
| `langchain/require-agent-max-iterations`    | LLM10 | Require maxIterations in AgentExecutor  |
| `langchain/no-unsafe-chain-invoke`          | LLM01 | Sanitize chain.invoke() inputs          |
| `langchain/validate-memory-input`           | LLM01 | Validate memory addMessage inputs       |
| `langchain/require-callback-error-handling` | LLM05 | Handle errors in callbacks              |

---

### 3. eslint-plugin-anthropic-security

**Target**: Anthropic SDK (`@anthropic-ai/sdk`)
**Weekly Downloads**: ~150K

#### Rules

| Rule                                  | OWASP | Description                                 |
| ------------------------------------- | ----- | ------------------------------------------- |
| `anthropic/no-unsafe-message-content` | LLM01 | Prevent prompt injection                    |
| `anthropic/require-max-tokens`        | LLM10 | Require max_tokens                          |
| `anthropic/validate-tool-use`         | LLM06 | Validate tool definitions                   |
| `anthropic/sanitize-message-response` | LLM05 | Sanitize response content                   |
| `anthropic/no-xml-injection`          | LLM01 | Prevent XML injection in structured prompts |

---

## Phase 2: Growing Ecosystems (Q2 2025)

### 4. eslint-plugin-vercel-ai-security

**Target**: Vercel AI SDK (`ai`, `@ai-sdk/*`)
**Weekly Downloads**: ~400K

#### Rules

| Rule                                      | OWASP | Description                          |
| ----------------------------------------- | ----- | ------------------------------------ |
| `vercel-ai/validate-generate-text-prompt` | LLM01 | Validate generateText prompts        |
| `vercel-ai/require-max-tokens`            | LLM10 | Require maxTokens option             |
| `vercel-ai/validate-tool-definition`      | LLM06 | Validate tool schemas                |
| `vercel-ai/sanitize-stream-output`        | LLM05 | Sanitize streaming responses         |
| `vercel-ai/require-abort-signal`          | LLM10 | Require AbortSignal for cancellation |

---

### 5. eslint-plugin-google-genai-security

**Target**: Google Generative AI (`@google/generative-ai`)
**Weekly Downloads**: ~200K

#### Rules

| Rule                                          | OWASP | Description                      |
| --------------------------------------------- | ----- | -------------------------------- |
| `google-genai/no-unsafe-prompt`               | LLM01 | Validate generateContent prompts |
| `google-genai/require-safety-settings`        | LLM02 | Require safety settings          |
| `google-genai/validate-function-declarations` | LLM06 | Validate function calling        |

---

## Phase 3: Specialized Frameworks (Q3 2025)

### 6. eslint-plugin-llamaindex-security

**Target**: LlamaIndex.js
**Focus**: RAG pipeline security

### 7. eslint-plugin-autogen-security

**Target**: AutoGen-style multi-agent frameworks
**Focus**: Agent communication and loop detection

### 8. eslint-plugin-semantic-kernel-security

**Target**: Microsoft Semantic Kernel
**Focus**: Plugin/function security

---

## Implementation Strategy

### Per-SDK Plugin Structure

```
eslint-plugin-{sdk}-security/
├── src/
│   ├── index.ts           # Plugin entry
│   ├── rules/
│   │   ├── no-unsafe-{pattern}/
│   │   │   ├── index.ts   # Rule implementation
│   │   │   └── *.test.ts  # Tests
│   │   └── .../
│   ├── utils/
│   │   ├── sdk-patterns.ts  # SDK-specific AST patterns
│   │   ├── type-guards.ts   # TypeScript type guards
│   │   └── api-shapes.ts    # API structure definitions
│   └── configs/
│       ├── recommended.ts
│       └── strict.ts
├── README.md
└── package.json
```

### Key Advantages

1. **Full Type Awareness**: Use SDK TypeScript definitions
2. **Version Tracking**: Handle API changes between versions
3. **Zero False Positives**: Match exact API signatures
4. **Deep Integration**: Understand response structures

---

## Contribution Guidelines

### Adding a New SDK Plugin

1. Research SDK API surface
2. Map OWASP LLM categories to SDK patterns
3. Create rule implementations with full type awareness
4. Write comprehensive tests with real API shapes
5. Document with SDK-specific examples

### Rule Quality Standards

- ✅ Uses exact SDK type definitions
- ✅ Handles SDK version differences
- ✅ Zero false positives on valid code
- ✅ Clear, SDK-specific error messages
- ✅ Provides actionable fix suggestions
- ✅ \>95% test coverage

---

## Timeline

| Phase | SDK          | Target Date | Status      |
| ----- | ------------ | ----------- | ----------- |
| 1     | OpenAI       | Q1 2025     | 🔜 Planning |
| 1     | LangChain    | Q1 2025     | 🔜 Planning |
| 1     | Anthropic    | Q1 2025     | 🔜 Planning |
| 2     | Vercel AI    | Q2 2025     | 📋 Backlog  |
| 2     | Google GenAI | Q2 2025     | 📋 Backlog  |
| 3     | LlamaIndex   | Q3 2025     | 📋 Backlog  |
| 3     | AutoGen      | Q3 2025     | 📋 Backlog  |

---

## Getting Involved

Interested in contributing to SDK-specific plugins?

1. **Open an Issue**: Propose new rules or SDKs
2. **Submit a PR**: Contribute rule implementations
3. **Review**: Help review SDK-specific patterns
4. **Test**: Test against real SDK usage patterns
