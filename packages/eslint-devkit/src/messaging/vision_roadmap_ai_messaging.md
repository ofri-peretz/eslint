# Vision & Roadmap: The "AI-Native" ESLint Messaging Standard

## 1. Vision Statement

To evolve `eslint-devkit` from a "Human-Formatted" logger into a **"Dual-Hertz" Communication Protocol**: transmitting high-fidelity, emotional feedback to developers while simultaneously streaming compact, structured, and strictly typed "Signal Data" to AI Agents.

We stop treating "LLM Readability" as "Simpler Text" and start treating it as **"Data Optimization"**.

## 2. Theoretical Architecture: "The Chameleon Formatter"

We propose a new formatting engine that renders messages based on the **Target Intelligence Class (TIC)**.

### Class A: Human Developer (The Current State)

- **Goal**: Emotion, Urgency, Visual Scan.
- **Format**: Icons, Vertical Alignment, Color (Terminal codes).
- **Example**:
  ```text
  🔒 SQL Injection | CRITICAL
     Fix: Use parameters...
  ```

### Class B: The Coding Agent (The New Standard)

- **Goal**: Zero Hallucination, AST Precision, Token Economy.
- **Format**: `JSON-L` (JSON Lines) or `Structured-XML` embedded in standard output or via side-channel.
- **Optimization**:
  - Remove "Stop Words" (The, A, Is).
  - Use Enums for Severity (1, 2, 3) instead of strings if possible, or standardized keys.
  - **Critical**: Include AST Selectors (`CallExpression > Identifier[name='query']`).

### Class C: The Hybrid (Cursor/Copilot Inline)

- **Goal**: Human readable BUT heavily guided for the "Fix" button context.
- **Format**: Markdown with hidden comments `<!-- AI_HINT: ... -->`.

## 3. Implementation Roadmap

### Phase 1: The "Context-Aware" Config (Global Configuration)

**Objective**: Allow plugins to define _who_ they are talking to.

- **Action**: Introduce `MessagingContext` configuration.
  ```typescript
  type Environment =
    | 'CLI'
    | 'CI'
    | 'IDE_CURSOR'
    | 'IDE_VSCODE'
    | 'AGENT_HEADLESS';
  ```
- **Feature**: `formatLLMMessage` accepts `env` context.
- **Benefit**: Users can set `ESLINT_AI_MODE=true` in `.env` to switch all plugins to "Agent Mode".

### Phase 2: Structured Token Optimization

**Objective**: Min-max token usage for LLMs.

- **Strategy**: "Dictionary Compression".
  Instead of repeating `OWASP:A01-Broken-Access-Control` (Token heavy), use mapped codes.
  - _Before_: `OWASP:A05-Injection ... Description: SQL Injection detected` (~15 tokens)
  - _After_: `{"id":"CWE-89","s":9.8,"f":"param_query"}` (~8 tokens) -> LLM expands via System Prompt.
  - _Docs_: Provide a "System Prompt" snippet for the LLM that maps short-codes to instructions.

### Phase 3: "CursorRules" Integration

**Objective**: Direct integration with Cursor's Agent.

- **Feature**: Auto-generate `.cursorrules` or `.agent_rules` from the plugin metadata.
- **Mechanism**: If a user has `eslint-plugin-nestjs-security`, the plugin offers a command `npx eslint-plugin-nestjs-security init-agent` which dumps a highly optimized `.cursorrules` file containing the _exact_ reasoning logic for the rules, pre-feeding the context window.

### Phase 4: AST-Targeting Fixes

**Objective**: Improve AI Fix Accuracy.

- **Innovation**: The error message includes the **AST Path**.
  ```text
  Error: SQL Injection
  Target: CallExpression[callee.property.name='query']
  Scope: ClassMethod[name='getUser']
  ```
  This tells the Agent _exactly_ where to look, reducing extensive file reading.

## 4. Benchmark: Current vs. Proposed

| Feature         | Current (`eslint-devkit`) | Proposed "AI-Native"                         | Improvement         |
| :-------------- | :------------------------ | :------------------------------------------- | :------------------ | --------------------- |
| **Puntuation**  | `                         | ` separators                                 | JSON/YAML keys      | Parsing 100% reliable |
| **Token Cost**  | ~50 tokens/msg            | ~20 tokens/msg (Compressed)                  | **60% Reduction**   |
| **Context**     | "Fix: Use X"              | "Fix: X via Standard Y"                      | Contextual Accuracy |
| **Speed**       | 100ms (Text Gen)          | 5ms (Structured Lookup)                      | Faster Planning     |
| **Integration** | Passive Text              | Active Directives (`<!-- @gpt-fix: ... -->`) | Agent Triggering    |

## 5. Concrete Proposal: The `AgentMessage` Interface

```typescript
// Proposed New Interface
interface AgentMessageOptions extends EnterpriseMessageOptions {
  agentContext?: {
    astSelector?: string; // Precision target
    requiredImports?: string[]; // Context for fix
    aiDifficulty: 'trivial' | 'reasoning_required'; // Prompt routing
  };
}

// Global Config Injection
export const GLOBAL_AI_CONFIG = {
  mode: process.env.ESLINT_AI_MODE || 'human', // Auto-detect
  compression: true,
};
```

## 6. Recommendations

1.  **Immediate**: Add `astSelector` and `aiDifficulty` to `EnterpriseMessageOptions`.
2.  **Short-term**: Create a `formatAgentResult` function that outputs compact JSON.
3.  **Strategic**: Build the `CursorRules` generator for your ecosystem.
