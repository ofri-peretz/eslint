/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Shared CWE-522 detector — an inference SDK's browser escape
 * hatch turned on.
 *
 * Both the OpenAI and Anthropic Node SDKs refuse to run in a browser by
 * default, and both unlock it with the same opt-in flag. Turning it on means
 * the API key is shipped to the client and is readable by anyone who opens
 * devtools; a leaked key is billable by whoever finds it.
 *
 * ## Which SDKs this can cover, and which it cannot
 *
 * Verified against the published tarballs (2026-08-05), not assumed:
 *
 * | SDK | Flag |
 * |---|---|
 * | `openai@6` | `dangerouslyAllowBrowser` |
 * | `@anthropic-ai/sdk@0.115` | `dangerouslyAllowBrowser` (`client.d.ts:140`) |
 * | `@google/generative-ai@0.24` | none |
 * | `@google/genai@2.15` | none |
 *
 * Neither Gemini SDK has a browser escape hatch, because neither refuses the
 * browser in the first place — there is no flag to detect and no equivalent
 * structural signal a linter can read without knowing whether the file ships
 * to a client. So this factory has two instantiations, not three. Inventing a
 * fuzzy third would report correct code.
 *
 * The gate compares against an exact SDK module specifier, which by the
 * taxonomy contract keeps it in the SDK's plugin rather than in
 * `browser-security`.
 */

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { createRule } from './rule-creator';
import { formatLLMMessage, MessageIcons } from '../messaging';
import {
  createModuleListEvidence,
  createModuleListMatcher,
} from './module-evidence';
import { AST_NODE_TYPES } from '../ast-node-types';
import { unwrapTypeSyntax } from '../ast/type-syntax';
import {
  createSdkClientMatcher,
  followConst,
  isEnvironmentRead,
  MAX_FOLLOW_HOPS,
  readObjectProperty,
  resolveObjectLiteral,
  variableOf,
} from './sdk-flow';

/** The opt-in both SDKs spell identically. */
export const BROWSER_ESCAPE_FLAG = 'dangerouslyAllowBrowser';

export interface BrowserEscapeHatchRuleConfig {
  /** Rule id, e.g. `no-browser-api-key-exposure`. */
  ruleName: string;
  /** Vendor name for the message, e.g. `OpenAI`. */
  vendor: string;
  /** Module names that open the gate — exact specifier or subpath. */
  modules: readonly string[];
  /** Rule documentation URL. */
  docsUrl: string;
  /** Vendor documentation link carried in the message. */
  documentationLink: string;
  /**
   * Client options that carry the credential, e.g. `['apiKey', 'authToken']`.
   * Default `['apiKey']`.
   */
  credentialProps?: readonly string[];
  /**
   * Client options that take a *token provider* instead of a key, e.g.
   * `azureADTokenProvider`. Both SDKs' Azure clients turn the browser flag on
   * themselves when one is passed — a per-user Entra token, not a shared key.
   * Default `['azureADTokenProvider']`.
   */
  tokenProviderProps?: readonly string[];
}

type MessageIds = 'browserKeyExposure';

export type CredentialOrigin = 'runtime' | 'shipped';

/**
 * Where a browser client's credential comes from.
 *
 * `shipped` — the build or the bundle carries it: a literal, an environment
 * read (`import.meta.env.VITE_…` is inlined), an imported or global constant.
 * That is the app's own key, and the flag hands it to every visitor.
 *
 * `runtime` — the browser obtains it per session: a function (the SDKs accept a
 * key *provider*), a parameter (the visitor's own key, bring-your-own-key), or
 * the result of an `await` or a call (an ephemeral token fetched from the
 * app's server — the pattern OpenAI's Realtime docs prescribe for browsers).
 * Nothing of the app's ships.
 *
 * A mixture (`userKey || import.meta.env.VITE_KEY`) is `shipped`: the fallback
 * still ships.
 */
export function credentialOrigin(
  node: TSESTree.Node,
  sourceCode: Readonly<TSESLint.SourceCode>,
  hops: number = MAX_FOLLOW_HOPS,
): CredentialOrigin {
  const current = unwrapTypeSyntax(node);
  if (hops <= 0) return 'shipped';
  const either = (a: TSESTree.Node, b: TSESTree.Node): CredentialOrigin =>
    credentialOrigin(a, sourceCode, hops - 1) === 'shipped' ||
    credentialOrigin(b, sourceCode, hops - 1) === 'shipped'
      ? 'shipped'
      : 'runtime';

  switch (current.type) {
    case AST_NODE_TYPES.ArrowFunctionExpression:
    case AST_NODE_TYPES.FunctionExpression:
    case AST_NODE_TYPES.AwaitExpression:
    case AST_NODE_TYPES.CallExpression:
    case AST_NODE_TYPES.NewExpression:
      return 'runtime';
    case AST_NODE_TYPES.ConditionalExpression:
      return either(current.consequent, current.alternate);
    case AST_NODE_TYPES.LogicalExpression:
      return either(current.left, current.right);
    case AST_NODE_TYPES.MemberExpression:
      return isEnvironmentRead(current, sourceCode)
        ? 'shipped'
        : credentialOrigin(current.object, sourceCode, hops - 1);
    case AST_NODE_TYPES.Identifier: {
      const variable = variableOf(current, sourceCode);
      const definition = variable?.defs[0];
      if (definition === undefined) return 'shipped';
      if (
        definition.type === 'Parameter' ||
        definition.type === 'FunctionName'
      ) {
        return 'runtime';
      }
      const init =
        definition.type === 'Variable'
          ? (definition.node as TSESTree.VariableDeclarator).init
          : null;
      return init === null
        ? 'shipped'
        : credentialOrigin(init, sourceCode, hops - 1);
    }
    default:
      return 'shipped';
  }
}

export type FlagVerdict = 'enabled' | 'absent' | 'unreadable';

/** Is this the escape-hatch key, written bare or quoted? */
function isFlagProperty(prop: TSESTree.ObjectLiteralElement): boolean {
  return (
    prop.type !== 'SpreadElement' &&
    !prop.computed &&
    ((prop.key.type === 'Identifier' &&
      prop.key.name === BROWSER_ESCAPE_FLAG) ||
      (prop.key.type === 'Literal' && prop.key.value === BROWSER_ESCAPE_FLAG))
  );
}

/**
 * Whether the client options literal turns the browser escape hatch on.
 *
 * @deprecated The rule no longer calls this: it follows consts and same-file
 * spreads through `readObjectProperty`, which a single-node reader cannot.
 * Kept because it is public API.
 *
 * A non-literal value is `unreadable` — `{ dangerouslyAllowBrowser: isBrowser }`
 * could be either at runtime, and reporting on a guess would flag correct code.
 * An explicit `false` is `absent`: the author already made the safe choice.
 *
 * Spreads are positional, not fatal. Only a spread that can *override* the flag
 * hides it:
 *
 *   { ...base }                                    → unreadable, base may set it
 *   { dangerouslyAllowBrowser: true, ...base }     → unreadable, base may unset it
 *   { ...base, dangerouslyAllowBrowser: true }     → ENABLED — the explicit key
 *                                                    wins, whatever base held
 *
 * Bailing on the first spread seen made that last shape silent, which is a
 * false negative on a definite finding rather than caution about an
 * ambiguous one.
 */
export function readFlag(options: TSESTree.ObjectExpression): FlagVerdict {
  const props = options.properties;
  const index = props.findIndex(isFlagProperty);

  if (index === -1) {
    // No explicit flag, but a spread anywhere could carry one.
    return props.some((prop) => prop.type === 'SpreadElement')
      ? 'unreadable'
      : 'absent';
  }

  // A spread after the flag can replace it wholesale.
  for (let i = index + 1; i < props.length; i++) {
    if (props[i]!.type === 'SpreadElement') return 'unreadable';
  }

  const value = (props[index] as TSESTree.Property).value;
  if (value.type === 'Literal' && value.value === true) return 'enabled';
  if (value.type === 'Literal') return 'absent';
  return 'unreadable';
}

export function createBrowserEscapeHatchRule(
  config: BrowserEscapeHatchRuleConfig,
) {
  // One probe per rule, not per file: it caches by `Program`, so the walk is
  // paid once however many rules in the plugin ask.
  const usesSdk = createModuleListEvidence(config.modules);
  const matcher = createSdkClientMatcher(
    createModuleListMatcher(config.modules),
  );
  const credentialProps = config.credentialProps ?? ['apiKey'];
  const tokenProviderProps = config.tokenProviderProps ?? [
    'azureADTokenProvider',
  ];

  return createRule<[], MessageIds>({
    name: config.ruleName,
    meta: {
      // Shared detection, shared runtimes: oxlint only if every plugin's rule
      // from this factory passes its own suite there.
      interop: { runtimes: ['eslint', 'oxlint'] },
      type: 'problem',
      docs: {
        url: config.docsUrl,
        description: `Forbid ${BROWSER_ESCAPE_FLAG}, which exposes the ${config.vendor} API key to the client`,
        cwe: 'CWE-522',
        cvss: 8.6,
      },
      messages: {
        browserKeyExposure: formatLLMMessage({
          icon: MessageIcons.SECURITY,
          issueName: `${config.vendor} API Key Exposed to the Browser`,
          cwe: 'CWE-522',
          owasp: 'A07:2021',
          cvss: 8.6,
          description:
            'dangerouslyAllowBrowser lets the SDK run client-side, which ships the API key to every visitor',
          severity: 'HIGH',
          compliance: ['SOC2', 'PCI-DSS'],
          fix: `Call ${config.vendor} from a server route and forward the result, so the key never leaves the server`,
          documentationLink: config.documentationLink,
        }),
      },
      schema: [],
    },
    defaultOptions: [],
    createOnce(context) {
      let sourceCode: Readonly<TSESLint.SourceCode>;

      /** `dangerouslyAllowBrowser: true`, directly or through a const. */
      function flagEnabled(options: TSESTree.ObjectExpression): boolean {
        const read = readObjectProperty(
          options,
          BROWSER_ESCAPE_FLAG,
          sourceCode,
        );
        if (read.kind !== 'value') return false;
        const value = followConst(read.node, sourceCode);
        return value.type === AST_NODE_TYPES.Literal && value.value === true;
      }

      /** A token provider is configured — the SDK enables the browser itself. */
      function hasTokenProvider(options: TSESTree.ObjectExpression): boolean {
        return tokenProviderProps.some((prop) => {
          const read = readObjectProperty(options, prop, sourceCode);
          if (read.kind !== 'value') return false;
          // The SDKs test `typeof provider === 'function'`: a literal (null,
          // false) or `undefined` is no provider.
          const value = followConst(read.node, sourceCode);
          return !(
            value.type === AST_NODE_TYPES.Literal ||
            (value.type === AST_NODE_TYPES.Identifier &&
              value.name === 'undefined')
          );
        });
      }

      /** Every credential the options carry is obtained per session. */
      function credentialIsRuntime(
        options: TSESTree.ObjectExpression,
      ): boolean {
        const values = credentialProps
          .map((prop) => readObjectProperty(options, prop, sourceCode))
          .flatMap((read) => (read.kind === 'value' ? [read.node] : []));
        return (
          values.length > 0 &&
          values.every(
            (value) => credentialOrigin(value, sourceCode) === 'runtime',
          )
        );
      }

      function inspect(node: TSESTree.NewExpression | TSESTree.CallExpression) {
        for (const index of matcher.optionArguments(node, sourceCode)) {
          const argument = node.arguments[index];
          if (
            argument === undefined ||
            argument.type === AST_NODE_TYPES.SpreadElement
          )
            continue;
          const options = resolveObjectLiteral(argument, sourceCode);
          if (options === undefined || !flagEnabled(options)) continue;
          if (hasTokenProvider(options) || credentialIsRuntime(options)) {
            continue;
          }
          context.report({ node, messageId: 'browserKeyExposure' });
          return;
        }
      }

      return {
        before() {
          // Asked once, up front, over the whole AST — so the verdict cannot depend
          // on whether the import is written above or below the client, which is
          // what the old two-visitor gate needed a `Program:exit` pass to survive.
          if (!usesSdk(context.sourceCode.ast)) return false;
          sourceCode = context.sourceCode;
          return true;
        },
        NewExpression: inspect,
        CallExpression: inspect,
      };
    },
  });
}
