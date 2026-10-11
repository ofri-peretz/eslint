/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent using AI output directly in dangerous operations
 * @description Detects when AI-generated content is used in eval, exec, or SQL
 * @see OWASP LLM05: Improper Output Handling
 * @see OWASP ASI05: Unexpected Code Execution
 */

import type { TSESLint } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  TSESTree,
  createRule,
  formatLLMMessage,
  MessageIcons,
  namesOneOf,
  objectKeyName,
  propertyName,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';
import { fileUsesVercelAi } from '../../utils/vercel-ai-evidence';
import { calleeName, isSdkHookCall, isSdkTypedParameter, lookupVariable } from '../../utils/sdk';
import { derivesFrom } from '../../utils/flow';

type MessageIds =
  | 'unsafeOutputExecution'
  | 'unsafeOutputInSQL'
  | 'unsafeOutputInHTML'
  | 'unsafeOutputInRequest';

export interface Options {
  /** Variable patterns that suggest AI output */
  aiOutputPatterns?: string[];
}

type RuleOptions = [Options?];

export const noUnsafeOutputHandling = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-output-handling',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/no-unsafe-output-handling.md',
      description: 'Prevent using AI output directly in dangerous operations (eval, SQL, HTML)',
      cwe: 'CWE-94',
      cvss: 9.8,
      confidence: 'medium',
    },
    messages: {
      unsafeOutputExecution: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'AI Output Used in Code Execution',
        cwe: 'CWE-94',
        owasp: 'A03:2021',
        cvss: 9.8,
        description: 'AI-generated content "{{variable}}" passed to {{function}}. This can lead to Remote Code Execution.',
        severity: 'CRITICAL',
        compliance: ['SOC2', 'PCI-DSS'],
        fix: 'Never execute AI-generated code directly. Use sandboxed execution with validation.',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
      unsafeOutputInSQL: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'AI Output in SQL Query',
        cwe: 'CWE-89',
        owasp: 'A03:2021',
        cvss: 9.0,
        description: 'AI-generated content used in SQL query. Use parameterized queries instead.',
        severity: 'CRITICAL',
        compliance: ['SOC2', 'PCI-DSS'],
        fix: 'Use parameterized queries: db.query("SELECT * FROM users WHERE id = ?", [aiOutput])',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html',
      }),
      unsafeOutputInHTML: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'AI Output in innerHTML',
        cwe: 'CWE-79',
        owasp: 'A03:2021',
        cvss: 7.5,
        description: 'AI-generated content assigned to innerHTML. This can lead to XSS attacks.',
        severity: 'HIGH',
        compliance: ['SOC2'],
        fix: 'Use textContent or sanitize HTML: element.textContent = aiOutput',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html',
      }),
      unsafeOutputInRequest: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'AI-Chosen Request URL',
        cwe: 'CWE-918',
        owasp: 'A10:2021',
        cvss: 8.6,
        description: 'Model-controlled value chooses the URL passed to fetch(). This can lead to Server-Side Request Forgery.',
        severity: 'HIGH',
        compliance: ['SOC2'],
        fix: 'Fix the host and pass model input only as a path or query value, or check the URL against an allow-list',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          aiOutputPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Variable patterns that suggest AI output',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      aiOutputPatterns: [
        'result.text',
        'response.text',
        'completion',
        'generated',
        'aiOutput',
        'aiResponse',
        'llmOutput',
        'llmResponse',
        'modelOutput',
        '.text',
      ],
    },
  ],
  create(context, [options]) {
    // Every rule in this plugin is Vercel-AI-specific, and none of them knew
    // it: over 107,384 files, 91% of this plugin's findings were in files with
    // no `ai` / `@ai-sdk` import. Registering no visitors is both the gate and
    // the cheap path — a file without the SDK does no work.
    if (!fileUsesVercelAi(context.sourceCode.ast)) return {};

    // Merged with `defaultOptions` before `create` runs.
    const { aiOutputPatterns } = options as Required<Options>;

    const sourceCode = context.sourceCode;

    const AI_SDK_CALLS = new Set(['generateText', 'streamText', 'generateObject', 'streamObject']);

    /** generateText(...) | ai.generateText(...) | sdk['generateText'](...) */
    function isAISDKCall(call: TSESTree.CallExpression): boolean {
      const callee = call.callee;
      if (callee.type === 'Identifier') return AI_SDK_CALLS.has(callee.name);
      // `has(null)` is already false for a runtime-keyed member.
      return callee.type === 'MemberExpression' && namesOneOf(propertyName(callee), AI_SDK_CALLS);
    }

    /**
     * Where model output enters a file: an AI SDK call's result, a UI hook's
     * result (`useChat()` / `useCompletion()` from the SDK), a tool's
     * `execute` parameters (filled from the model's tool call), and a
     * parameter typed with an SDK message type (`{ m }: { m: UIMessage }`).
     */
    const outputFlow = {
      sourceCode,
      isSource: (node: TSESTree.Node) =>
        (node.type === 'CallExpression' && isAISDKCall(node)) || isSdkHookCall(node, sourceCode),
      isSourceParameter: (
        variable: TSESLint.Scope.Variable,
        fn: TSESTree.FunctionLike,
      ) =>
        (fn.parent.type === 'Property' && isToolExecute(fn.parent)) ||
        isSdkTypedParameter(variable, sourceCode),
    };

    /**
     * Structurally model output: followed back through declarations,
     * reassignments, member reads, string / array derivations, same-file
     * helpers and component props to one of the sources above. Keyed on
     * resolved bindings, never names: a shadowing `text` is a different
     * variable.
     */
    function isBoundOutput(node: TSESTree.Node): boolean {
      return derivesFrom(node, outputFlow);
    }

    /**
     * Model output, or a value whose name matches a configured output pattern.
     * The name patterns only ever narrow a resolved sink, and they apply only
     * to plain references: a call (`DOMPurify.sanitize(result.text)`,
     * `truncate(result.text)`) transforms its input and is not the output.
     */
    function isLikelyAIOutput(node: TSESTree.Node): boolean {
      if (isBoundOutput(node)) return true;
      if (node.type !== 'Identifier' && node.type !== 'MemberExpression') return false;
      const text = sourceCode.getText(node);
      return aiOutputPatterns.some((pattern: string) => text.includes(pattern));
    }

    /**
     * Check an interpolated string for AI output: a template literal's `${...}`
     * expressions and the operands of a `+` chain, rather than the node's
     * whole source text.
     */
    function containsAIOutput(node: TSESTree.Node): boolean {
      if (node.type === 'TemplateLiteral') {
        return node.expressions.some(containsAIOutput);
      }
      if (node.type === 'BinaryExpression') {
        // `+` only: any other operator compares or computes, it builds no string.
        return (
          node.operator === '+' &&
          (containsAIOutput(node.left) || containsAIOutput(node.right))
        );
      }
      return isLikelyAIOutput(node);
    }

    /** A global the file does not redeclare (`eval`, `Function`, `fetch`). */
    function isGlobal(node: TSESTree.Node, name: string): boolean {
      return (
        node.type === 'Identifier' &&
        node.name === name &&
        !lookupVariable(name, sourceCode.getScope(node))?.defs.length
      );
    }

    /** `child_process`'s exec family or `vm`'s compilers, resolved through imports/requires. */
    function isCodeExecutionCallee(callee: TSESTree.Node): boolean {
      if (isGlobal(callee, 'eval') || isGlobal(callee, 'Function')) return true;
      const binding = resolveModuleBinding(callee, sourceCode.getScope(callee));
      if (binding) {
        const fn = binding.path[binding.path.length - 1];
        return (
          (binding.module === 'child_process' && CHILD_PROCESS_SINKS.has(fn)) ||
          (binding.module === 'vm' && VM_SINKS.has(fn))
        );
      }
      // An undeclared `execSync(...)` — a snippet or a global — keeps the
      // historical behaviour; a declared one must resolve to child_process.
      return (
        callee.type === 'Identifier' &&
        CHILD_PROCESS_SINKS.has(callee.name) &&
        !lookupVariable(callee.name, sourceCode.getScope(callee))?.defs.length
      );
    }

    /** Is this a tool's `execute`, whose parameters the model fills? */
    /** Is this property — whose value is a function — a tool's `execute`? */
    function isToolExecute(node: TSESTree.Property): boolean {
      if (objectKeyName(node) !== 'execute') return false;
      const definition = node.parent as TSESTree.ObjectExpression;
      const owner = definition.parent;
      if (
        owner.type === 'CallExpression' &&
        TOOL_FACTORIES.has(calleeName(owner.callee) as string)
      ) {
        return true;
      }
      return definition.properties.some(
        (prop) =>
          prop.type === 'Property' && SCHEMA_KEYS.has(objectKeyName(prop) as string),
      );
    }

    /** Model output choosing the request target: the whole URL, or its leading part. */
    function choosesRequestTarget(node: TSESTree.Node): boolean {
      if (node.type === 'TemplateLiteral') {
        return (
          node.quasis[0].value.raw === '' &&
          isBoundOutput(node.expressions[0])
        );
      }
      return isBoundOutput(node);
    }

    function reportExecution(node: TSESTree.Node, callee: TSESTree.Node, args: TSESTree.CallExpressionArgument[]) {
      for (const arg of args) {
        if (containsAIOutput(arg)) {
          context.report({
            node: arg,
            messageId: 'unsafeOutputExecution',
            data: {
              variable: sourceCode.getText(arg),
              function: sourceCode.getText(callee),
            },
          });
        }
      }
    }

    return {
      NewExpression(node: TSESTree.NewExpression) {
        // `new Function(code)`, `new vm.Script(code)`
        const isFunction = isGlobal(node.callee, 'Function');
        const binding = resolveModuleBinding(node.callee, sourceCode.getScope(node));
        if (isFunction || (binding?.module === 'vm' && binding.path[0] === 'Script')) {
          reportExecution(node, node.callee, node.arguments);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (isCodeExecutionCallee(node.callee)) {
          reportExecution(node, node.callee, node.arguments);
          return;
        }

        const name = calleeName(node.callee);

        if (isGlobal(node.callee, 'fetch')) {
          const [target] = node.arguments;
          if (target && choosesRequestTarget(target)) {
            context.report({ node: target, messageId: 'unsafeOutputInRequest' });
          }
          return;
        }

        if (!SQL_SINKS.has(name as string)) return;
        const [query] = node.arguments;
        // The query string itself — interpolated, concatenated, or passed whole.
        // Values in a later bind-parameter array are the safe path.
        if (query && containsAIOutput(query)) {
          context.report({ node: query, messageId: 'unsafeOutputInSQL' });
        }
      },

      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (node.left.type === 'MemberExpression') {
          const prop = node.left.property;
          if (prop.type === 'Identifier' && prop.name === 'innerHTML') {
            if (isLikelyAIOutput(node.right)) {
              context.report({
                node: node.right,
                messageId: 'unsafeOutputInHTML',
              });
            }
          }
        }
      },

      // React: <div dangerouslySetInnerHTML={{ __html: aiOutput }} />
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.name !== 'dangerouslySetInnerHTML') return;
        const container = node.value;
        if (
          container?.type !== AST_NODE_TYPES.JSXExpressionContainer ||
          container.expression.type !== AST_NODE_TYPES.ObjectExpression
        ) {
          return;
        }
        for (const prop of container.expression.properties) {
          if (
            prop.type === AST_NODE_TYPES.Property &&
            objectKeyName(prop) === '__html' &&
            isLikelyAIOutput(prop.value)
          ) {
            context.report({ node: prop.value, messageId: 'unsafeOutputInHTML' });
          }
        }
      },
    };
  },
});

/** `child_process` functions that run a command or file. */
const CHILD_PROCESS_SINKS = new Set([
  'exec', 'execSync', 'execFile', 'execFileSync', 'spawn', 'spawnSync', 'fork',
]);

/** `vm` functions that compile or run source text. */
const VM_SINKS = new Set(['runInNewContext', 'runInThisContext', 'runInContext', 'compileFunction']);

/** Query methods that take raw SQL as their first argument. */
const SQL_SINKS = new Set([
  'query', 'execute', 'raw', 'run', 'unsafe', '$queryRawUnsafe', '$executeRawUnsafe',
]);

/** Factories that wrap a tool definition. */
const TOOL_FACTORIES = new Set(['tool', 'dynamicTool']);

/** Keys that mark an object literal as a tool definition. */
const SCHEMA_KEYS = new Set(['inputSchema', 'parameters']);
