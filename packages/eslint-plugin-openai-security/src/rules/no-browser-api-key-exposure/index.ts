/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Forbid `dangerouslyAllowBrowser: true` on the OpenAI client
 * @description The flag exists to let the SDK run in a browser, which means the
 * API key travels to the client and is readable by anyone who opens devtools.
 * A leaked key is billable by whoever finds it.
 * @see https://github.com/openai/openai-node#requestresponse-types
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'browserKeyExposure';

const FLAG = 'dangerouslyAllowBrowser';

/**
 * The rule only arms in files that import an OpenAI SDK: the `openai` package
 * itself (including subpaths) or anything under the `@openai/` scope, which is
 * where the Agents SDK lives. Matched precisely so an unrelated package such as
 * `openai-mock` does not arm it.
 */
function isOpenAiModule(source: string): boolean {
  return source === 'openai' || source.startsWith('openai/') || source.startsWith('@openai/');
}

type FlagVerdict = 'enabled' | 'absent' | 'unreadable';

/**
 * Whether the client options literal turns the browser escape hatch on.
 *
 * A spread or a non-literal value is `unreadable`: the flag may be set
 * elsewhere, and reporting on a guess would flag correct code.
 */
function readFlag(options: TSESTree.ObjectExpression): FlagVerdict {
  for (const prop of options.properties) {
    if (prop.type === 'SpreadElement') return 'unreadable';
    if (prop.computed) continue;
    const isFlag =
      (prop.key.type === 'Identifier' && prop.key.name === FLAG) ||
      (prop.key.type === 'Literal' && prop.key.value === FLAG);
    if (!isFlag) continue;
    if (prop.value.type === 'Literal' && prop.value.value === true) return 'enabled';
    if (prop.value.type === 'Literal') return 'absent';
    return 'unreadable';
  }
  return 'absent';
}

export const noBrowserApiKeyExposure = createRule<[], MessageIds>({
  name: 'no-browser-api-key-exposure',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-openai-security/docs/rules/no-browser-api-key-exposure.md',
      description: 'Forbid dangerouslyAllowBrowser, which exposes the OpenAI API key to the client',
      cwe: 'CWE-522',
      cvss: 8.6,
    },
    messages: {
      browserKeyExposure: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'OpenAI API Key Exposed to the Browser',
        cwe: 'CWE-522',
        owasp: 'A07:2021',
        cvss: 8.6,
        description:
          'dangerouslyAllowBrowser lets the SDK run client-side, which ships the API key to every visitor',
        severity: 'HIGH',
        compliance: ['SOC2', 'PCI-DSS'],
        fix: 'Call OpenAI from a server route and forward the result, so the key never leaves the server',
        documentationLink: 'https://platform.openai.com/docs/api-reference/authentication',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    let importsOpenAi = false;
    const candidates: TSESTree.Node[] = [];

    function inspectOptions(node: TSESTree.Node, args: TSESTree.CallExpressionArgument[]): void {
      const options = args[0];
      if (options?.type !== 'ObjectExpression') return;
      if (readFlag(options) === 'enabled') candidates.push(node);
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (isOpenAiModule(node.source.value)) importsOpenAi = true;
      },

      NewExpression(node: TSESTree.NewExpression) {
        inspectOptions(node, [...node.arguments]);
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments[0]?.type === 'Literal' &&
          typeof node.arguments[0].value === 'string' &&
          isOpenAiModule(node.arguments[0].value)
        ) {
          importsOpenAi = true;
          return;
        }
        // Factory helpers such as createOpenAI({ ... }) take the same options.
        inspectOptions(node, [...node.arguments]);
      },

      'Program:exit'() {
        if (!importsOpenAi) return;
        for (const node of candidates) {
          context.report({ node, messageId: 'browserKeyExposure' });
        }
      },
    };
  },
});
