# Task: AI-Native ESLint Messaging Architecture - Research & Vision

## Status

- [x] **Research Synthesis**: Consolidate findings on LLM interaction optimization, token efficiency, and agentic protocols (SARIF, CursorRules, MCP). <!-- id: 0 -->
- [x] **Draft Vision Strategy**: Define the "Next-Gen" messaging architecture distinguishing between Human-Readable (Compact) and AI-Readable (Context-Rich/Structured) outputs. <!-- id: 1 -->
- [x] **Design Roadmap**: Outline phases for implementation (Global Config, Environment Detection, Schema Definition). <!-- id: 2 -->
- [x] **Benchmark Analysis**: Compare current `eslint-devkit` format vs. proposed architecture (Tokens, Clarity, Context). <!-- id: 3 -->
- [x] **User Review**: Present findings and roadmap for approval. <!-- id: 4 -->

## Implementation: Phase 1 (Foundation)

- [ ] **Implementation Plan**: Create detailed technical design for Global Config and Agent Interfaces. <!-- id: 5 -->
- [ ] **Schema Definition**: Implement `MessagingContext` and `AgentMessageOptions` in `types.ts`. <!-- id: 6 -->
- [ ] **Formatter Logic**: Implement `formatAgentMessage` and context-switching logic in `formatters.ts`. <!-- id: 7 -->
- [ ] **Global State**: Implement `GLOBAL_AI_CONFIG` pattern. <!-- id: 8 -->
- [ ] **Verification**: Add unit tests for agent-formatted outputs. <!-- id: 9 -->

## Context

The user wants to elevate the current ESLint messaging system (`eslint-devkit`) to be "AI-Native". This means optimizing for:

- **LLM Consumption**: Low token usage, high semantic density, structured data.
- **Agentic Workflows**: Compatibility with Cursor, Copilot, and independent agents.
- **Standards**: Building on SARIF and emerging AI protocols.

## Research Highlights (Preliminary)

- **Error Propagation**: Clearer, actionable errors reduce cascading failures in agents.
- **Token Optimization**: "Context Engineering" (Offloading, Reduction) is key.
- **Standards**: SARIF is the industry bedrock; `.cursorrules` provide environment-specific guidance.
- **Context Injection**: Dynamic contextualization based on the environment (IDE vs. CI vs. Agent).

## Next Steps

1. Create `knowledge/research_synthesis_ai_messaging.md`. (Done)
2. Create `knowledge/vision_roadmap_ai_messaging.md`. (Done)
