/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Call `.rpc()` with a literal function name
 * @description `supabase.rpc(name)` executes a Postgres function by name over
 * PostgREST. When that name is computed, the caller chooses which database
 * function runs — and Supabase projects routinely expose privileged helpers
 * (`delete_user`, `grant_admin`) alongside the intended one.
 * A name the file pins to a closed set is not computed by the caller: a const,
 * a ternary between literals, a lookup in a same-file object of literals, or a
 * parameter whose declared type is a union of string literals. Those are
 * followed (bounded, same file). Anything else — a `string` parameter, a
 * request field, a reassigned `let` — reports.
 *
 * @see https://supabase.com/docs/reference/javascript/rpc
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
  variableOf,
} from '@interlace/eslint-devkit';

import { fileUsesSupabase } from '../../utils/supabase-evidence';

type MessageIds = 'dynamicRpcName';

type SourceCode = Readonly<TSESLint.SourceCode>;

/** How many links a name is followed through before the rule gives up. */
const MAX_HOPS = 8;

/**
 * A TypeScript type that admits only string literals: `'a' | 'b'`, directly
 * or through a same-file `type Kind = …` alias.
 */
function isStringLiteralUnion(
  type: TSESTree.TypeNode,
  sourceCode: SourceCode,
  hops: number,
): boolean {
  if (hops <= 0) return false;
  if (type.type === 'TSLiteralType') {
    return (
      type.literal.type === 'Literal' && typeof type.literal.value === 'string'
    );
  }
  if (type.type === 'TSUnionType') {
    return type.types.every((member) =>
      isStringLiteralUnion(member, sourceCode, hops - 1),
    );
  }
  if (type.type === 'TSTypeReference' && type.typeName.type === 'Identifier') {
    const definition = variableOf(type.typeName, sourceCode)?.defs[0];
    const alias = definition?.node as TSESTree.Node | undefined;
    return (
      alias?.type === 'TSTypeAliasDeclaration' &&
      isStringLiteralUnion(alias.typeAnnotation, sourceCode, hops - 1)
    );
  }
  return false;
}

/**
 * Is this function name one of a set the file fixes?
 *
 * `'get_user'` and `` `get_user` `` are; so is `alt ? 'match_v2' : 'match_v1'`,
 * `RPC[kind]` over `const RPC = { a: 'x', b: 'y' }`, a template whose every
 * interpolation is itself fixed, and a parameter typed `'a_fn' | 'b_fn'` —
 * whatever the caller passes, the compiler holds it to that list.
 */
function isFixedName(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  hops: number = MAX_HOPS,
): boolean {
  if (hops <= 0) return false;
  const current = followConst(node, sourceCode);
  const fixed = (child: TSESTree.Node) =>
    isFixedName(child, sourceCode, hops - 1);

  switch (current.type) {
    case 'Literal':
      return typeof current.value === 'string';
    case 'TemplateLiteral':
      // Inside a template a number or boolean is as fixed as a string:
      // `` `stats_v${2}` `` names one function.
      return current.expressions.every((part) => {
        const value = followConst(part, sourceCode);
        return value.type === 'Literal' || fixed(part);
      });
    case 'ConditionalExpression':
      return fixed(current.consequent) && fixed(current.alternate);
    case 'MemberExpression': {
      const table = resolveObjectLiteral(current.object, sourceCode);
      if (table === undefined) return false;
      const key = propertyName(current);
      if (key !== null) {
        const read = readObjectProperty(table, key, sourceCode);
        return read.kind === 'value' && fixed(read.node);
      }
      // `RPC[kind]` — whichever key is chosen, every value is fixed.
      return table.properties.every(
        (property) => property.type === 'Property' && fixed(property.value),
      );
    }
    case 'Identifier': {
      const definition = variableOf(current, sourceCode)?.defs[0];
      if (definition?.type !== 'Parameter') return false;
      const annotation = (definition.name as TSESTree.Identifier).typeAnnotation
        ?.typeAnnotation;
      return (
        annotation !== undefined &&
        isStringLiteralUnion(annotation, sourceCode, hops - 1)
      );
    }
    default:
      return false;
  }
}

export const noDynamicRpcName = createRule<[], MessageIds>({
  name: 'no-dynamic-rpc-name',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-supabase-security/docs/rules/no-dynamic-rpc-name.md',
      description: 'Call `.rpc()` with a literal function name',
      cwe: 'CWE-913',
      cvss: 8.1,
    },
    messages: {
      dynamicRpcName: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Supabase RPC Called With a Computed Function Name',
        cwe: 'CWE-913',
        owasp: 'A03:2021',
        cvss: 8.1,
        description:
          '`.rpc()` receives a computed name, so the caller decides which Postgres function executes rather than the code doing so',
        severity: 'HIGH',
        compliance: ['SOC2', 'ISO27001'],
        fix: 'Name the function at the call: `db.rpc("get_user_profile", args)`. To choose between functions, pick from a closed set the file fixes — a ternary between literals, a lookup in a const object of literal names, or a parameter typed as a union of string literals — never a `string` the caller supplies.',
        documentationLink: 'https://supabase.com/docs/reference/javascript/rpc',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    return {
      before() {
        if (!fileUsesSupabase(context.sourceCode.ast)) return false;
        return true;
      },
      CallExpression(node): void {
        const { callee } = node;
        if (callee.type !== 'MemberExpression') return;
        if (propertyName(callee) !== 'rpc') return;

        const [name] = node.arguments;
        if (name === undefined) return;
        // A spread is unreadable from here, not evidence of a computed name.
        if (name.type === 'SpreadElement') return;
        if (isFixedName(name, context.sourceCode)) return;

        context.report({ node: name, messageId: 'dynamicRpcName' });
      },
    };
  },
});
