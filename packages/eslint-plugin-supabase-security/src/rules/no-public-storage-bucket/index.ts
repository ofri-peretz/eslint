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
  TSESTree,
  createRule,
  formatLLMMessage,
  MessageIcons,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';

import { fileUsesSupabase } from '../../utils/supabase-evidence';

type MessageIds = 'publicBucket';

/** `createBucket` and `updateBucket` both take the same options object. */
const BUCKET_METHODS = new Set(['createBucket', 'updateBucket']);

/** The `public: true` property in an options object literal, if it is there. */
function publicProperty(
  options: TSESTree.ObjectExpression,
): TSESTree.Property | undefined {
  for (const property of options.properties) {
    // A spread carries options this node cannot see; not evidence either way.
    if (property.type !== 'Property') continue;
    if (objectKeyName(property) !== 'public') continue;
    if (property.value.type === 'Literal' && property.value.value === true)
      return property;
  }
  return undefined;
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
          if (argument.type !== 'ObjectExpression') continue;
          const flagged = publicProperty(argument);
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
