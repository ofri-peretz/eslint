/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-insecure-http-parser
 * Detects `insecureHTTPParser: true` on Node HTTP servers, clients and agents.
 * CWE-444: Inconsistent Interpretation of HTTP Requests (Request Smuggling)
 *
 * Node's strict llhttp parser rejects ambiguous message framing — a request
 * carrying both `Content-Length` and `Transfer-Encoding`, an invalid chunk
 * size, a bare LF terminator. `insecureHTTPParser: true` swaps in the lenient
 * parser, which accepts all of it. When a proxy and an origin disagree about
 * where one request ends and the next begins, an attacker can prepend a
 * request to somebody else's connection: that is request smuggling.
 *
 * The option name is Node-specific and has exactly one meaning, so the
 * property itself is the finding — anchoring on it also catches the options
 * object that is built once and passed to `http.createServer` elsewhere.
 *
 * @see https://cwe.mitre.org/data/definitions/444.html
 * @see https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
  AST_NODE_TYPES,
  isTestFilePath,
} from '@interlace/eslint-devkit';

type MessageIds = 'insecureHttpParser' | 'useStrictParser';

export interface Options {
  /** Allow the lenient parser in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noInsecureHttpParser = createRule<RuleOptions, MessageIds>({
  name: 'no-insecure-http-parser',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-insecure-http-parser.md',
      description: 'Disallow insecureHTTPParser: true on Node HTTP servers and clients',
      cwe: 'CWE-444',
      cvss: 7.5,
    },
    hasSuggestions: true,
    messages: {
      insecureHttpParser: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Lenient HTTP parser enabled',
        cwe: 'CWE-444',
        description:
          'insecureHTTPParser: true accepts ambiguous message framing (conflicting Content-Length/Transfer-Encoding, invalid chunk sizes). When a front-end proxy and this process disagree on request boundaries, an attacker can smuggle a request onto another user connection.',
        severity: 'HIGH',
        fix: 'Remove insecureHTTPParser (or set it to false) and fix the upstream that emits malformed framing',
        documentationLink:
          'https://portswigger.net/web-security/request-smuggling',
      }),
      useStrictParser: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use the strict parser',
        description: "Node's default llhttp parser rejects ambiguous framing",
        severity: 'LOW',
        fix: 'insecureHTTPParser: false (or remove the option)',
        documentationLink:
          'https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow the lenient parser in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = false } = options as Options;

    const isTestFile = allowInTests && isTestFilePath(context.filename);

    /**
     * `insecureHTTPParser` written as a plain key (`{ insecureHTTPParser: … }`,
     * `opts.insecureHTTPParser`) or as a string key (`{ 'insecureHTTPParser':
     * … }`, `opts['insecureHTTPParser']`). A computed identifier key names a
     * variable, not this option, so it is not evidence.
     */
    function isParserKey(key: TSESTree.Node, computed: boolean): boolean {
      if (key.type === AST_NODE_TYPES.Identifier) {
        return !computed && key.name === 'insecureHTTPParser';
      }
      return (
        key.type === AST_NODE_TYPES.Literal &&
        key.value === 'insecureHTTPParser'
      );
    }

    /**
     * Only a literal `true` is evidence. `insecureHTTPParser: allowLegacy`
     * may well be `false` at runtime, and reporting it would be a guess.
     */
    function enablesLenientParser(value: TSESTree.Node): boolean {
      return (
        value.type === AST_NODE_TYPES.Literal && value.value === true
      );
    }

    function report(node: TSESTree.Node, value: TSESTree.Node): void {
      context.report({
        node,
        messageId: 'insecureHttpParser',
        suggest: [
          {
            messageId: 'useStrictParser',
            fix: (fixer: TSESLint.RuleFixer) => fixer.replaceText(value, 'false'),
          },
        ],
      });
    }

    return {
      Property(node: TSESTree.Property) {
        if (isTestFile) return;
        if (!isParserKey(node.key, node.computed)) return;
        if (!enablesLenientParser(node.value)) return;
        report(node, node.value);
      },

      // `serverOptions.insecureHTTPParser = true` — same switch, thrown later.
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (isTestFile) return;
        if (node.left.type !== AST_NODE_TYPES.MemberExpression) return;
        if (!isParserKey(node.left.property, node.left.computed)) return;
        if (!enablesLenientParser(node.right)) return;
        report(node, node.right);
      },
    };
  },
});

export type { Options as NoInsecureHttpParserOptions };
