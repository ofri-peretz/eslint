/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Shared CWE-798 detector — a literal API key in an inference
 * SDK's client construction.
 *
 * ## Why this is not `secure-coding/no-hardcoded-credentials`
 *
 * Measured, not assumed: every rule in `eslint-plugin-secure-coding` reports
 * *nothing* on `new OpenAI({ apiKey: 'sk-proj-…' })`,
 * `new GoogleGenerativeAI('AIza…')` or the Anthropic equivalent. The generic
 * credential rules look for password-shaped names and connection strings; an
 * SDK's client options are a different shape and no rule in the ecosystem
 * covers them.
 *
 * The gate here compares against an exact SDK module specifier, which by the
 * taxonomy contract puts it in that SDK's plugin — not in `secure-coding`.
 * The logic is shared because the three SDKs differ only in the module name,
 * the option names, and the remediation copy.
 */

import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from './rule-creator';
import { createModuleListEvidence } from './module-evidence';
import { formatLLMMessage, MessageIcons } from '../messaging';

export interface SdkApiKeyRuleConfig {
  /** Rule id, e.g. `no-hardcoded-api-key`. */
  ruleName: string;
  /** Vendor name for the message, e.g. `OpenAI`. */
  vendor: string;
  /**
   * Module names that open the gate. Matched as the exact specifier or a
   * subpath of it (`openai` matches `openai` and `openai/resources`, but not
   * `openai-edge`, which is a different package with a different client).
   * A bare scope (`@anthropic-ai`) matches every package under it.
   */
  modules: readonly string[];
  /** Client-option names that hold the credential, e.g. `apiKey`. */
  keyProps: readonly string[];
  /**
   * The corrected construction shown in the fix.
   *
   * A template, not a computed string: `{{prop}}` here is resolved by ESLint
   * from the same report data as the description, so a consumer's RuleTester
   * cases only ever declare `prop`. Passing a pre-computed string instead
   * leaves an unhydrated placeholder in every expected message.
   *
   * SDKs whose key can be positional should keep this static — `{{prop}}`
   * reads as "The first argument" there and would render nonsense inside an
   * options literal.
   */
  fixTemplate: string;
  /** Rule documentation URL. */
  docsUrl: string;
  /** Vendor documentation link carried in the message. */
  documentationLink: string;
  /**
   * Constructors whose *first positional argument* is the key itself, e.g.
   * `new GoogleGenerativeAI('AIza…')`. Empty for SDKs that only take options.
   */
  positionalKeyConstructors?: readonly string[];
}

type MessageIds = 'hardcodedApiKey';

/**
 * What `{{prop}}` reads as when the credential is a positional argument rather
 * than a named option. Exported so a test can pin the string the
 * description renders, without duplicating the literal.
 */
export const POSITIONAL_KEY_LABEL = 'The first argument';

/**
 * `literal` carries the property name that actually held the credential.
 * A bare verdict left the caller guessing, and it guessed the first configured
 * prop — naming the wrong option whenever a later one was the offender.
 */
export type KeyVerdict =
  | { kind: 'literal'; prop: string }
  | { kind: 'safe' }
  | { kind: 'unreadable' };

/**
 * Whether the client options literal carries an inline credential.
 *
 * `process.env.OPENAI_API_KEY` and any other non-literal expression are `safe`
 * — reading a key from the environment is the correct pattern. A spread is
 * `unreadable`: the key may be in the spread source, and guessing there would
 * flag correct code.
 *
 * A safe credential prop `continue`s rather than returning, because a config
 * can carry more than one: Anthropic's `{ apiKey, authToken }` meant an
 * environment-read `apiKey` returned early and a hardcoded `authToken` right
 * after it was never inspected. `safe` is only the verdict once every property
 * has been looked at.
 */
export function readCredential(
  options: TSESTree.ObjectExpression,
  keyProps: ReadonlySet<string>,
): KeyVerdict {
  for (const prop of options.properties) {
    if (prop.type === 'SpreadElement') return { kind: 'unreadable' };
    if (prop.computed) continue;
    // Computed keys are already skipped, so a key here is an Identifier
    // (`apiKey:`) or a Literal (`'apiKey':`) — there is no third form, and a
    // guard for one would be unreachable.
    const name = prop.key.type === 'Identifier' ? prop.key.name : String(prop.key.value);
    if (!keyProps.has(name)) continue;
    if (prop.value.type !== 'Literal') continue;
    // An empty string is a placeholder, not a credential.
    if (typeof prop.value.value === 'string' && prop.value.value.length > 0) {
      return { kind: 'literal', prop: name };
    }
  }
  return { kind: 'safe' };
}

/**
 * The callee name of a `new X(...)` / `X(...)`, if it is statically known.
 * `new pkg.Client()` counts as `Client` — the namespace is not the identity.
 */
export function calleeName(node: TSESTree.Node): string | undefined {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
    return node.property.name;
  }
  return undefined;
}

export function createSdkApiKeyRule(config: SdkApiKeyRuleConfig) {
  const keyProps = new Set(config.keyProps);
  const positional = new Set(config.positionalKeyConstructors ?? []);
  // One probe per rule, not per file: it caches by `Program`, so the walk is
  // paid once however many rules in the plugin ask.
  const usesSdk = createModuleListEvidence(config.modules);

  return createRule<[], MessageIds>({
    name: config.ruleName,
    meta: {
      type: 'problem',
      docs: {
        url: config.docsUrl,
        description: `Forbid a literal API key in the ${config.vendor} client options`,
        cwe: 'CWE-798',
        cvss: 9.1,
      },
      messages: {
        hardcodedApiKey: formatLLMMessage({
          icon: MessageIcons.SECURITY,
          issueName: `Hardcoded ${config.vendor} Credential`,
          cwe: 'CWE-798',
          owasp: 'A07:2021',
          cvss: 9.1,
          description:
            '{{prop}} is a string literal, so the credential is committed to source control and readable by anyone with repository access',
          severity: 'CRITICAL',
          compliance: ['SOC2', 'PCI-DSS'],
          fix: `Read it from the environment: ${config.fixTemplate}`,
          documentationLink: config.documentationLink,
        }),
      },
      schema: [],
    },
    defaultOptions: [],
    create(context) {
      // Asked once, up front, over the whole AST — so the verdict cannot depend
      // on whether the import is written above or below the client, which is
      // what the old two-visitor gate needed a `Program:exit` pass to survive.
      if (!usesSdk(context.sourceCode.ast)) return {};

      function inspect(node: TSESTree.Node, args: readonly TSESTree.Node[]): void {
        const first = args[0];
        if (first === undefined) return;

        // `new GoogleGenerativeAI('AIza…')` — the key is the argument itself.
        if (first.type === 'Literal') {
          const name = calleeName(
            (node as TSESTree.NewExpression | TSESTree.CallExpression).callee,
          );
          if (
            name !== undefined &&
            positional.has(name) &&
            typeof first.value === 'string' &&
            first.value.length > 0
          ) {
            context.report({ node, messageId: 'hardcodedApiKey', data: { prop: POSITIONAL_KEY_LABEL } });
          }
          return;
        }

        if (first.type !== 'ObjectExpression') return;
        const verdict = readCredential(first, keyProps);
        if (verdict.kind === 'literal') {
          context.report({ node, messageId: 'hardcodedApiKey', data: { prop: verdict.prop } });
        }
      }

      return {
        NewExpression(node: TSESTree.NewExpression) {
          inspect(node, node.arguments);
        },

        CallExpression(node: TSESTree.CallExpression) {
          inspect(node, node.arguments);
        },
      };
    },
  });
}
