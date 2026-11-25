/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-hardcoded-connection-string
 * Detects hardcoded MongoDB connection strings with credentials
 * CWE-798: Hardcoded Credentials
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
} from '@interlace/eslint-devkit';
import { fileUsesMongo } from '../../utils/mongo-evidence';

type MessageIds = 'hardcodedConnectionString';
export interface Options {
  allowInTests?: boolean;
}
type RuleOptions = [Options?];

const MONGODB_URI_PATTERN = /mongodb(\+srv)?:\/\/.+/i;

/**
 * Whether the URI names only this machine and carries no credentials:
 * `mongodb://localhost:27017/app`, `mongodb://127.0.0.1/app`,
 * `mongodb://[::1]/app`.
 *
 * It is the default every Mongo tutorial and `config/env/all.js` writes as the
 * fallback behind an environment variable. There is no secret in it to leak
 * and no remote host to pin, so reporting it under "hardcoded credentials"
 * (CWE-798) is a false positive. Anything with userinfo (`user:pass@`), a
 * remote host, or an empty host (a template that supplies it) is still
 * reported.
 */
function isCredentialFreeLoopback(uri: string): boolean {
  const authority = /^mongodb(?:\+srv)?:\/\/([^/?#]*)/i.exec(uri)?.[1];
  if (authority === undefined || authority.includes('@')) return false;
  const hosts = authority.split(',');
  return hosts.every((entry) => {
    const host = entry.startsWith('[')
      ? entry.slice(0, entry.indexOf(']') + 1)
      : entry.replace(/:\d*$/, '');
    return (
      host.toLowerCase() === 'localhost' ||
      host === '[::1]' ||
      /^127(?:\.\d{1,3}){3}$/.test(host)
    );
  });
}

function isHardcodedUri(text: string): boolean {
  return MONGODB_URI_PATTERN.test(text) && !isCredentialFreeLoopback(text);
}

export const noHardcodedConnectionString = createRule<RuleOptions, MessageIds>({
  name: 'no-hardcoded-connection-string',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mongodb-security/docs/rules/no-hardcoded-connection-string.md',
      description:
        'Prevent hardcoded MongoDB connection strings with credentials',
      cwe: 'CWE-798',
      cvss: 7.5,
    },
    messages: {
      hardcodedConnectionString: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hardcoded Connection String',
        cwe: 'CWE-798',
        cvss: 7.5,
        description: 'MongoDB connection string contains hardcoded credentials',
        severity: 'HIGH',
        fix: 'Use process.env.MONGODB_URI instead of hardcoded connection strings',
        documentationLink: 'https://cwe.mitre.org/data/definitions/798.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: { allowInTests: { type: 'boolean', default: true } },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    function checkLiteral(node: TSESTree.Literal) {
      if (
        typeof node.value === 'string' &&
        isHardcodedUri(node.value)
      ) {
        context.report({
          node,
          messageId: 'hardcodedConnectionString',
        });
      }
    }

    return {
      before() {
        // Every rule here is MongoDB-specific, and none of them could ask the
        // file-level question: over the corpus, 47% of this plugin's findings were
        // in files with no Mongo in them. `receiver.ts` discriminates by receiver
        // NAME, which matches `userModel.findOne()` in a TypeORM repository just as
        // well as in a Mongoose one. Registering no visitors is both the gate and
        // the cheap path.
        if (!fileUsesMongo(context.sourceCode.ast)) return false;

        const [options = {}] = context.options;
        const { allowInTests = true } = options as Options;
        const filename = context.filename;
        const inTestFile = isTestFilePath(filename);

        if (allowInTests && inTestFile) {
          return false;
        }
        return true;
      },
      Literal: checkLiteral,
      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        if (node.quasis.length > 0) {
          const firstQuasi = node.quasis[0].value.raw;
          if (isHardcodedUri(firstQuasi)) {
            context.report({
              node,
              messageId: 'hardcodedConnectionString',
            });
          }
        }
      },
    };
  },
});

export default noHardcodedConnectionString;
