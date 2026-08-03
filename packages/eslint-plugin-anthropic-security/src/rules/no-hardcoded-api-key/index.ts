/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Forbid a literal API key in the Anthropic client options
 * @description A key written into source is committed, pushed, mirrored into
 * every clone and CI cache, and is billable by anyone who reads it. Rotating it
 * means a code change, so leaked keys tend to stay live.
 * @see https://docs.anthropic.com/en/api/getting-started
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'hardcodedApiKey';

/** Covers the base SDK and the agent SDK, which share the client options. */
const ANTHROPIC_MODULE_PREFIX = '@anthropic-ai/';

const KEY_PROPS = new Set(['apiKey', 'authToken']);

type KeyVerdict = 'literal' | 'safe' | 'unreadable';

/**
 * Whether the client options literal carries an inline credential.
 *
 * `process.env.ANTHROPIC_API_KEY` and any other non-literal expression are
 * `safe` — reading a key from the environment is the correct pattern. A spread
 * is `unreadable`: the key may be in the spread source, and guessing there
 * would flag correct code.
 */
function readCredential(options: TSESTree.ObjectExpression): KeyVerdict {
  for (const prop of options.properties) {
    if (prop.type === 'SpreadElement') return 'unreadable';
    if (prop.computed) continue;
    const isCredential =
      (prop.key.type === 'Identifier' && KEY_PROPS.has(prop.key.name)) ||
      (prop.key.type === 'Literal' && KEY_PROPS.has(String(prop.key.value)));
    if (!isCredential) continue;
    if (prop.value.type !== 'Literal') return 'safe';
    // An empty string is a placeholder, not a credential.
    if (typeof prop.value.value === 'string' && prop.value.value.length > 0) return 'literal';
    return 'safe';
  }
  return 'safe';
}

export const noHardcodedApiKey = createRule<[], MessageIds>({
  name: 'no-hardcoded-api-key',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-anthropic-security/docs/rules/no-hardcoded-api-key.md',
      description: 'Forbid a literal API key in the Anthropic client options',
      cwe: 'CWE-798',
      cvss: 9.1,
    },
    messages: {
      hardcodedApiKey: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hardcoded Anthropic Credential',
        cwe: 'CWE-798',
        owasp: 'A07:2021',
        cvss: 9.1,
        description:
          '{{prop}} is a string literal, so the credential is committed to source control and readable by anyone with repository access',
        severity: 'CRITICAL',
        compliance: ['SOC2', 'PCI-DSS'],
        fix: 'Read it from the environment: new Anthropic({ {{prop}}: process.env.ANTHROPIC_API_KEY })',
        documentationLink: 'https://docs.anthropic.com/en/api/getting-started',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    let importsAnthropic = false;
    const candidates: Array<{ node: TSESTree.Node; prop: string }> = [];

    function inspect(node: TSESTree.Node, args: TSESTree.CallExpressionArgument[]): void {
      const options = args[0];
      if (options?.type !== 'ObjectExpression') return;
      if (readCredential(options) === 'literal') {
        candidates.push({ node, prop: 'apiKey' });
      }
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (node.source.value.startsWith(ANTHROPIC_MODULE_PREFIX)) importsAnthropic = true;
      },

      NewExpression(node: TSESTree.NewExpression) {
        inspect(node, [...node.arguments]);
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments[0]?.type === 'Literal' &&
          typeof node.arguments[0].value === 'string' &&
          node.arguments[0].value.startsWith(ANTHROPIC_MODULE_PREFIX)
        ) {
          importsAnthropic = true;
          return;
        }
        inspect(node, [...node.arguments]);
      },

      'Program:exit'() {
        if (!importsAnthropic) return;
        for (const { node, prop } of candidates) {
          context.report({ node, messageId: 'hardcodedApiKey', data: { prop } });
        }
      },
    };
  },
});
