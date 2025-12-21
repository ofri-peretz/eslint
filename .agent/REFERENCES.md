---
description: Industry references for multi-agent orchestration systems
---

# Agentic Systems References

This document provides references to industry-leading multi-agent orchestration frameworks for future iterations and improvements.

## Primary Inspiration

### wshobson/agents (Claude Code Plugins)

- **GitHub**: https://github.com/wshobson/agents
- **Key Concepts**:
  - 67 granular, single-purpose plugins
  - 99 specialized agents with domain expertise
  - 107 agent skills with progressive disclosure (metadata → instructions → resources)
  - 15 workflow orchestrators for multi-agent coordination
  - Three-tier model strategy (Opus/Sonnet/Haiku for cost optimization)

---

## Industry Frameworks

### Microsoft AutoGen

- **GitHub**: https://github.com/microsoft/autogen
- **Type**: Multi-agent conversation framework
- **Key Features**:
  - Agents with different roles (planner, coder, reviewer)
  - Human-in-the-loop interaction
  - Cooperative task execution
- **Inspiration**: Role-based agent design, human review points

### LangGraph (LangChain)

- **GitHub**: https://github.com/langchain-ai/langgraph
- **Type**: Computational graph-based workflows
- **Key Features**:
  - Multi-step workflows as graphs
  - Single-agent, multi-agent, hierarchical control flows
  - Explicit state management between nodes
- **Inspiration**: Wave-based execution, dependency graphs

### CrewAI

- **GitHub**: https://github.com/crewAIInc/crewAI
- **Type**: Agent "crews" with defined roles
- **Key Features**:
  - Agents with goals and backstories
  - Task delegation between agents
  - Lightweight Python framework
- **Inspiration**: Agent specialization, goal-oriented design

### OpenAI Swarm (Experimental)

- **GitHub**: https://github.com/openai/swarm
- **Type**: Lightweight multi-agent orchestration
- **Key Features**:
  - Agent handoffs
  - Simple routing between agents
  - Minimal boilerplate
- **Inspiration**: Simple handoff patterns, experimentation approach

### Semantic Kernel (Microsoft)

- **GitHub**: https://github.com/microsoft/semantic-kernel
- **Type**: SDK for AI integration
- **Key Features**:
  - Plugin architecture
  - Planner for multi-step execution
  - Memory management
- **Inspiration**: Plugin loading, skill organization

---

## Design Patterns to Adopt

### From wshobson/agents

| Pattern                | Description                          | Our Implementation                             |
| ---------------------- | ------------------------------------ | ---------------------------------------------- |
| Progressive Disclosure | Load skills on-demand                | Skills folder with activation criteria         |
| Granular Plugins       | Single-purpose modules               | Separate agent/skill files                     |
| Model Tiers            | Different models for different tasks | Future: could route to different LLM endpoints |

### From AutoGen

| Pattern           | Description              | Our Implementation                       |
| ----------------- | ------------------------ | ---------------------------------------- |
| Role-Based Agents | Planner, Coder, Reviewer | Architect, ESLint Dev, Security, etc.    |
| Human-in-Loop     | Review checkpoints       | Design pipeline review, wave checkpoints |

### From LangGraph

| Pattern         | Description           | Our Implementation                    |
| --------------- | --------------------- | ------------------------------------- |
| Graph Execution | DAG of tasks          | Breakdown pipeline dependency mapping |
| State Passing   | Context between nodes | Task artifacts passed between phases  |

---

## Future Enhancements

Inspired by these frameworks, future improvements could include:

1. **Agent Memory** — Persistent context across sessions (like LangGraph state)
2. **Agent Handoffs** — Formal handoff protocol (like Swarm)
3. **Cost Tracking** — Token/cost tracking per agent (like wshobson model tiers)
4. **Evaluation** — Built-in scoring/metrics for agent outputs
5. **Visual Builder** — Langflow-style visual pipeline editor

---

## Quick Links

| Framework       | GitHub                                            | Docs                                                      |
| --------------- | ------------------------------------------------- | --------------------------------------------------------- |
| wshobson/agents | [repo](https://github.com/wshobson/agents)        | [docs](https://github.com/wshobson/agents/tree/main/docs) |
| AutoGen         | [repo](https://github.com/microsoft/autogen)      | [docs](https://microsoft.github.io/autogen/)              |
| LangGraph       | [repo](https://github.com/langchain-ai/langgraph) | [docs](https://python.langchain.com/docs/langgraph)       |
| CrewAI          | [repo](https://github.com/crewAIInc/crewAI)       | [docs](https://docs.crewai.com/)                          |
| Swarm           | [repo](https://github.com/openai/swarm)           | [readme](https://github.com/openai/swarm#readme)          |
