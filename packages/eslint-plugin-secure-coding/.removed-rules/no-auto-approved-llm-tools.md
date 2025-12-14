# Removal of `no-auto-approved-llm-tools` Rule

## Summary

Removed the generic `no-auto-approved-llm-tools` ESLint rule as it was not effective or relevant in its current form.

## Rationale

The rule had fundamental issues that made it impractical for production use:

### 1. **Name-Based Detection is Too Broad**

- The rule triggered on ANY function containing `executeTool`, `runTool`, `invokeTool`, or `tool.call`
- This would cause massive false positives in any real codebase
- Functions like `executeToolTip()`, `runToolchain()`, or build system utilities would incorrectly trigger
- No way to distinguish between LLM agent tools and regular application tools

### 2. **Generic Pattern Matching**

- Just greps for words like `checkPolicy`, `authorize`, `hasPermission`, `canExecute`
- Doesn't understand actual authorization frameworks (Oso, Casbin, Auth0, etc.)
- Can't verify if the authorization check is actually effective or related to the tool execution

### 3. **Not Framework-Aware**

- Doesn't understand actual LLM agentic frameworks:
  - LangChain's tool/agent execution patterns
  - AutoGPT/CrewAI action systems
  - Semantic Kernel plugin/function calling
  - OpenAI function calling with tools
  - Anthropic tool use
- Can't detect framework-specific authorization patterns

### 4. **No Data Flow Analysis**

- Can't track if the tool execution is actually coming from an LLM agent
- Can't determine if it's just a regular function call
- No understanding of control flow or authorization context

### 5. **Shallow Block-Level Analysis**

- Only checks for authorization keywords in the same block statement
- Doesn't understand authorization that happens in:
  - Parent scopes
  - Middleware/decorators
  - Authorization services/classes
  - Framework-level auth hooks

## Better Approach

**Framework-specific rules** that understand actual agentic patterns:

1. **`no-auto-approved-langchain-tools`**
   - Detects LangChain `Tool`, `StructuredTool` definitions
   - Ensures tools have authorization in their implementation
   - Understands LangChain agent executor patterns

2. **`no-auto-approved-openai-function-calls`**
   - Detects OpenAI function calling with tools parameter
   - Ensures function implementations have authorization
   - Understands OpenAI SDK patterns

3. **`no-auto-approved-semantic-kernel-plugins`**
   - Detects Semantic Kernel plugin functions
   - Validates plugin-level authorization
   - Understands SK function decorators

4. **`no-auto-approved-autogpt-actions`**
   - Detects AutoGPT/CrewAI action definitions
   - Ensures actions have permission checks
   - Understands agent action patterns

## Files Removed

- `/src/rules/no-auto-approved-llm-tools/index.ts`
- `/src/rules/no-auto-approved-llm-tools/no-auto-approved-llm-tools.test.ts`
- `/docs/rules/no-auto-approved-llm-tools.md`

## Changes Made

- Removed import from `/src/index.ts`
- Removed export from rules object
- Updated rule count from 18 to 17 LLM rules
- Updated LLM06 category from 4 to 3 rules

## Impact

- **No breaking changes** for users who weren't using this rule
- Users who had this rule enabled will need to remove it from their config
- Paves the way for more effective, framework-specific authorization rules

## Security Consideration

While removing this rule, the security concern it attempted to address is **still valid**:

- LLM agents should not auto-execute tools without proper authorization
- This is covered by **OWASP LLM06: Excessive Agency**

The solution is to implement framework-specific rules that understand actual patterns, rather than relying on generic name-based heuristics.

## Next Steps

1. Research popular LLM agentic frameworks and their tool execution patterns
2. Design framework-specific rules with deep AST analysis
3. Implement data flow tracking to follow tool definitions → executions
4. Support common authorization patterns (RBAC, ABAC, policy engines)
5. Provide auto-fix capabilities where safe
