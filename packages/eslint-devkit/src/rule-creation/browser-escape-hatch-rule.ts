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

import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from './rule-creator';
import { formatLLMMessage, MessageIcons } from '../messaging';
import { createModuleListEvidence } from './module-evidence';

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
}

type MessageIds = 'browserKeyExposure';

export type FlagVerdict = 'enabled' | 'absent' | 'unreadable';

/** Is this the escape-hatch key, written bare or quoted? */
function isFlagProperty(prop: TSESTree.ObjectLiteralElement): boolean {
  return (
    prop.type !== 'SpreadElement' &&
    !prop.computed &&
    ((prop.key.type === 'Identifier' && prop.key.name === BROWSER_ESCAPE_FLAG) ||
      (prop.key.type === 'Literal' && prop.key.value === BROWSER_ESCAPE_FLAG))
  );
}

/**
 * Whether the client options literal turns the browser escape hatch on.
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
    return props.some((prop) => prop.type === 'SpreadElement') ? 'unreadable' : 'absent';
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

export function createBrowserEscapeHatchRule(config: BrowserEscapeHatchRuleConfig) {
  // One probe per rule, not per file: it caches by `Program`, so the walk is
  // paid once however many rules in the plugin ask.
  const usesSdk = createModuleListEvidence(config.modules);

  return createRule<[], MessageIds>({
    name: config.ruleName,
    meta: {
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
    create(context) {
      // Asked once, up front, over the whole AST — so the verdict cannot depend
      // on whether the import is written above or below the client, which is
      // what the old two-visitor gate needed a `Program:exit` pass to survive.
      if (!usesSdk(context.sourceCode.ast)) return {};

      function inspect(node: TSESTree.Node, args: readonly TSESTree.Node[]): void {
        const options = args[0];
        if (options?.type !== 'ObjectExpression') return;
        if (readFlag(options) === 'enabled') {
          context.report({ node, messageId: 'browserKeyExposure' });
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
