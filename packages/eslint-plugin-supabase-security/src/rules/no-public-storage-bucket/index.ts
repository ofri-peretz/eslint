/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Do not create a Supabase storage bucket as public
 * @description A public bucket serves every object in it to anyone with the URL,
 * with no auth and no RLS check. Object names are guessable far more often than
 * teams expect — sequential ids, e-mail addresses, original filenames — so
 * "public" is a decision about the whole bucket's contents, made once, in one
 * argument, at creation.
 * @see https://supabase.com/docs/guides/storage/security/access-control
 */

import {
  TSESLint,
  TSESTree,
  createRule,
  followConst,
  formatLLMMessage,
  MessageIcons,
  propertyName,
  readObjectProperty,
  resolveObjectLiteral,
} from '@interlace/eslint-devkit';

import { fileUsesSupabase } from '../../utils/supabase-evidence';

type MessageIds = 'publicBucket';

/** `createBucket` and `updateBucket` both take the same options object. */
const BUCKET_METHODS = new Set(['createBucket', 'updateBucket']);

/**
 * The `public: true` an options object sets, if it sets one — written inline,
 * held in a const, or brought in by a same-file spread. The last write wins, as
 * at runtime: `{ public: true, ...opts }` is whatever `opts` says, and an
 * unreadable `opts` is no evidence either way.
 */
function publicFlag(
  options: TSESTree.ObjectExpression,
  sourceCode: Readonly<TSESLint.SourceCode>,
): TSESTree.Node | undefined {
  const read = readObjectProperty(options, 'public', sourceCode);
  if (read.kind !== 'value') return undefined;
  const value = followConst(read.node, sourceCode);
  if (value.type !== 'Literal' || value.value !== true) return undefined;
  // Report the `public: true` property where it is written — a read value is
  // always a property's value.
  return read.node.parent!;
}

export const noPublicStorageBucket = createRule<[], MessageIds>({
  name: 'no-public-storage-bucket',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-supabase-security/docs/rules/no-public-storage-bucket.md',
      description: 'Do not create a Supabase storage bucket as public',
      cwe: 'CWE-732',
      cvss: 7.5,
    },
    messages: {
      publicBucket: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Supabase Storage Bucket Created Public',
        cwe: 'CWE-732',
        owasp: 'A01:2021',
        cvss: 7.5,
        description:
          '`{{method}}` sets `public: true`, which serves every object in the bucket to anyone holding the URL — no session, no RLS check',
        severity: 'HIGH',
        compliance: ['SOC2', 'GDPR', 'HIPAA'],
        fix: 'Leave the bucket private and hand out time-limited access per object: `createSignedUrl(path, 60)`',
        documentationLink:
          'https://supabase.com/docs/guides/storage/security/access-control',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    if (!fileUsesSupabase(context.sourceCode.ast)) return {};

    return {
      CallExpression(node): void {
        const { callee } = node;
        if (callee.type !== 'MemberExpression') return;
        const method = propertyName(callee);
        if (method === null || !BUCKET_METHODS.has(method)) return;

        for (const argument of node.arguments) {
          if (argument.type === 'SpreadElement') continue;
          const options = resolveObjectLiteral(argument, context.sourceCode);
          if (options === undefined) continue;
          const flagged = publicFlag(options, context.sourceCode);
          if (flagged !== undefined) {
            context.report({
              node: flagged,
              messageId: 'publicBucket',
              data: { method },
            });
            return;
          }
        }
      },
    };
  },
});
