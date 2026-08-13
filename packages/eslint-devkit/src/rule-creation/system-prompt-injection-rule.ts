/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Shared CWE-1427 detector — untrusted content built into a
 * system prompt on a raw inference SDK.
 *
 * A system prompt is instruction text. Whatever is spliced into it is read by
 * the model as instructions, not as data, so an attacker who controls any part
 * of it controls the agent's rules. This is the same argument as
 * `mcp-sdk-security/no-tool-description-injection`, one layer down: tool
 * descriptions and system prompts are both model-facing instruction surfaces
 * that must be static.
 *
 * ## Why this is not `vercel-ai-security/no-dynamic-system-prompt`
 *
 * That rule gates on the Vercel AI SDK's *bare* functions — `generateText`,
 * `streamText`, `generateObject`, `streamObject` — and reads its `system` /
 * `instructions` options. This one gates on a raw SDK's *method* calls
 * (`client.messages.create`, `client.chat.completions.create`,
 * `model.generateContent`) and the shapes those take, including the
 * `messages: [{ role: 'system' }]` array form the Vercel SDK does not use.
 *
 * The two gates cannot both match one call: a bare `generateText(...)` is never
 * a member call ending in `create`/`generateContent`, and the raw SDKs are
 * never invoked as bare functions. A file may import both SDKs and each rule
 * still reports only its own calls — which is the taxonomy contract's hard
 * rule, no line reported twice.
 */

import { AST_NODE_TYPES } from '../ast-node-types';
import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from './rule-creator';
import { formatLLMMessage, MessageIcons } from '../messaging';
import { createModuleListEvidence } from './module-evidence';

/**
 * Configuration for one vendor's instantiation of the CWE-1427 detector.
 *
 * The contract is: `modules` decides *whether* the rule is armed in a file,
 * `requestPaths` decides *which calls* it looks at, and `systemPromptProps`
 * decides *which option* inside those calls holds the instruction text. The
 * `messages: [{ role: 'system' }]` array form is read for every vendor and is
 * not configurable — every SDK in this family spells it the same way.
 *
 * `requestPaths` is what keeps two vendors' instantiations off the same line;
 * see the note on that field before adding a path.
 */
export interface SystemPromptInjectionRuleConfig {
  ruleName: string;
  /** Vendor name for the message, e.g. `OpenAI`. */
  vendor: string;
  /** Module names that open the gate — exact specifier or subpath. */
  modules: readonly string[];
  /**
   * Qualified member paths whose first argument carries the request, e.g.
   * `messages.create` or `completions.create`. Matched as a suffix of the
   * callee's member path.
   *
   * The *path*, not the leaf method: `create` alone is not SDK-specific, and
   * matching on it meant a file importing two SDKs reported one line twice —
   * measured, and exactly what the taxonomy contract forbids. Anthropic's
   * `messages.create` and OpenAI's `completions.create` are distinct; a bare
   * `generateText(...)` has no member path at all, which is what keeps
   * vercel-ai-security's shape out.
   */
  requestPaths: readonly string[];
  /** Option names that hold the system prompt directly, e.g. `system`. */
  systemPromptProps: readonly string[];
  docsUrl: string;
  documentationLink: string;
}

type MessageIds = 'untrustedSystemPrompt';

/**
 * Is this expression static instruction text?
 *
 * Static means: a string literal, a template with no interpolations, or a
 * concatenation of those. An interpolation, a call, an await or a member
 * expression can all carry content this file cannot see.
 *
 * A bare identifier is the one deliberate exception, and only as the WHOLE
 * value: `const SYSTEM = '…'` above the call is the correct pattern and by far
 * the most common one. Following it is the data-flow analysis these rules exist
 * to avoid, and reporting every `system: SYSTEM_PROMPT` would make the rule
 * unusable. Inside a concatenation the same identifier is the dynamic half, so
 * the exception does not apply there — see isStaticText.
 */
export function isStaticInstruction(node: TSESTree.Node): boolean {
  // Only as the WHOLE value. Inside a concatenation an identifier is the
  // dynamic half — `'You are ' + role` is exactly the shape this rule exists
  // to catch, and treating the identifier as static there made it silent.
  if (node.type === AST_NODE_TYPES.Identifier) return true;
  return isStaticText(node);
}

/** Static text with no escape hatch for identifiers. */
function isStaticText(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.Literal) return typeof node.value === 'string';
  if (node.type === AST_NODE_TYPES.TemplateLiteral) return node.expressions.length === 0;
  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
    return isStaticText(node.left) && isStaticText(node.right);
  }
  return false;
}

/** Static name of a property key, or undefined when it isn't statically known. */
export function staticKey(prop: TSESTree.Node): string | undefined {
  if (prop.type !== AST_NODE_TYPES.Property || prop.computed) return undefined;
  if (prop.key.type === AST_NODE_TYPES.Identifier) return prop.key.name;
  if (prop.key.type === AST_NODE_TYPES.Literal && typeof prop.key.value === 'string') {
    return prop.key.value;
  }
  return undefined;
}

/**
 * Is this object a chat message whose role is the system role?
 *
 * Only a literal `'system'` counts. `{ role: someRole }` is not knowably the
 * system turn, and guessing would report user turns — which are *supposed* to
 * carry untrusted content.
 */
export function isSystemMessage(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.ObjectExpression) return false;
  return node.properties.some((prop) => {
    if (staticKey(prop) !== 'role') return false;
    const value = (prop as TSESTree.Property).value;
    return value.type === AST_NODE_TYPES.Literal && value.value === 'system';
  });
}

/** The `content` value of a message object, if it has a static `content` key. */
export function messageContent(node: TSESTree.ObjectExpression): TSESTree.Node | undefined {
  for (const prop of node.properties) {
    if (staticKey(prop) === 'content') return (prop as TSESTree.Property).value;
  }
  return undefined;
}

/**
 * Dot-joined member path of a callee, root object excluded.
 *
 * `client.chat.completions.create` -> `chat.completions.create`.
 * A bare `generateText` -> undefined: no member path, so no raw-SDK rule can
 * match it and the Vercel AI SDK's form stays with its own plugin.
 */
export function calleePath(callee: TSESTree.Node): string | undefined {
  const parts: string[] = [];
  let node: TSESTree.Node = callee;
  while (node.type === AST_NODE_TYPES.MemberExpression) {
    if (node.computed || node.property.type !== AST_NODE_TYPES.Identifier) return undefined;
    parts.unshift(node.property.name);
    node = node.object;
  }
  return parts.length > 0 ? parts.join('.') : undefined;
}

export function createSystemPromptInjectionRule(config: SystemPromptInjectionRuleConfig) {
  const promptProps = new Set(config.systemPromptProps);
  const paths = config.requestPaths;
  // One probe per rule, not per file: it caches by `Program`, so the walk is
  // paid once however many rules in the plugin ask.
  const usesSdk = createModuleListEvidence(config.modules);

  return createRule<[], MessageIds>({
    name: config.ruleName,
    meta: {
      type: 'problem',
      docs: {
        url: config.docsUrl,
        description: `Disallow untrusted content built into the ${config.vendor} system prompt`,
        cwe: 'CWE-1427',
        cvss: 8.1,
      },
      messages: {
        untrustedSystemPrompt: formatLLMMessage({
          icon: MessageIcons.SECURITY,
          issueName: `Untrusted Content in ${config.vendor} System Prompt`,
          cwe: 'CWE-1427',
          owasp: 'A03:2021',
          cvss: 8.1,
          description:
            'The system prompt is built at runtime, so whatever is spliced in is read by the model as instructions rather than as data — anyone controlling that value controls the agent',
          severity: 'HIGH',
          compliance: ['SOC2'],
          fix: 'Keep the system prompt a static string. Pass runtime values as a separate user message, where the model treats them as data — never interpolate them into the instructions.',
          documentationLink: config.documentationLink,
        }),
      },
      schema: [],
    },
    defaultOptions: [],
    create(context) {
      // Asked once, up front, over the whole AST — so the verdict cannot depend
      // on whether the import is written above or below the call, which is what
      // the old two-visitor gate needed a `Program:exit` pass to survive.
      if (!usesSdk(context.sourceCode.ast)) return {};

      /** Report the value of any system-prompt option that is not static. */
      function inspectRequest(options: TSESTree.ObjectExpression): void {
        for (const prop of options.properties) {
          const key = staticKey(prop);
          if (key === undefined) continue;
          const value = (prop as TSESTree.Property).value;

          // `system: …` / `instructions: …` / `systemInstruction: …`
          if (promptProps.has(key)) {
            collect(value);
            continue;
          }

          // `messages: [{ role: 'system', content: … }, …]`
          if (key === 'messages' && value.type === AST_NODE_TYPES.ArrayExpression) {
            for (const element of value.elements) {
              if (element === null || !isSystemMessage(element)) continue;
              const content = messageContent(element as TSESTree.ObjectExpression);
              if (content !== undefined) collect(content);
            }
          }
        }
      }

      /**
       * Gemini nests the instruction as `systemInstruction: { parts: [{ text }] }`
       * as well as accepting a bare string, so unwrap one level of that shape
       * before judging.
       */
      function collect(value: TSESTree.Node): void {
        if (value.type === AST_NODE_TYPES.ObjectExpression) {
          for (const prop of value.properties) {
            const key = staticKey(prop);
            if (key === 'text') collect((prop as TSESTree.Property).value);
            if (key === 'parts') {
              const parts = (prop as TSESTree.Property).value;
              if (parts.type !== AST_NODE_TYPES.ArrayExpression) continue;
              for (const part of parts.elements) {
                if (part !== null) collect(part);
              }
            }
          }
          return;
        }
        if (!isStaticInstruction(value)) {
          context.report({ node: value, messageId: 'untrustedSystemPrompt' });
        }
      }

      return {
        CallExpression(node: TSESTree.CallExpression) {
          // A member call whose path ends in one of this SDK's request paths.
          const path = calleePath(node.callee);
          if (path === undefined) return;
          if (!paths.some((p) => path === p || path.endsWith(`.${p}`))) return;

          const request = node.arguments[0];
          if (request?.type === AST_NODE_TYPES.ObjectExpression) inspectRequest(request);
        },
      };
    },
  });
}
