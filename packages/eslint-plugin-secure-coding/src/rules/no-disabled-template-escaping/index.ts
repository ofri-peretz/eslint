/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-disabled-template-escaping
 * Detects `<object>.escapeMarkup = false`, which switches off a template
 * engine's HTML auto-escaping (CWE-79).
 *
 *   view.escapeMarkup = false;     // every {{value}} now renders as raw HTML
 *
 * Auto-escaping is the whole XSS defence of a logic-less template: it is what
 * turns `<script>` in a user's display name into text. Turning it off is a
 * global decision made on one line, far from every template it affects, so no
 * review of an individual template will see it.
 *
 * The property is matched in each spelling the language gives it — `o.k`,
 * `o['k']` and `` o[`k`] `` — through the devkit's `propertyName`. A computed
 * key that is a VARIABLE (`o[escapeMarkup]`) is not matched: which property it
 * writes is decided at runtime, and its name is not a fact about the property.
 *
 * @see https://cwe.mitre.org/data/definitions/79.html
 */
import type { TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
} from '@interlace/eslint-devkit';

type MessageIds = 'escapingDisabled';

/**
 * @protocol-constant The option name the template engines read. A property
 * name, compared by exact equality, not inferred from a substring.
 */
const ESCAPE_OPTION = 'escapeMarkup';

export const noDisabledTemplateEscaping = createRule<[], MessageIds>({
  name: 'no-disabled-template-escaping',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-disabled-template-escaping',
      description:
        'Disallows assigning `false` to `escapeMarkup`, which disables template HTML auto-escaping (CWE-79)',
      cwe: 'CWE-79',
      cweJustification:
        'CWE-79 (Improper Neutralization of Input During Web Page Generation) — escapeMarkup is the neutralization step: with it false, the engine interpolates values into HTML verbatim, so any user-controlled value rendered through it is a cross-site scripting sink.',
      cvss: 6.1,
    },
    messages: {
      escapingDisabled: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Template auto-escaping disabled (CWE-79)',
        cwe: 'CWE-79',
        description:
          'escapeMarkup is set to false, so the template engine renders every interpolated value as raw HTML. One user-controlled value in any template is then a cross-site scripting vulnerability.',
        severity: 'MEDIUM',
        fix: "Remove the assignment and keep auto-escaping on. Render trusted HTML through the template engine's explicit raw-output syntax at the one site that needs it, after sanitizing it.",
        documentationLink: 'https://cwe.mitre.org/data/definitions/79.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    return {
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (
          node.operator === '=' &&
          node.left.type === AST_NODE_TYPES.MemberExpression &&
          propertyName(node.left) === ESCAPE_OPTION &&
          node.right.type === AST_NODE_TYPES.Literal &&
          node.right.value === false
        ) {
          context.report({ node, messageId: 'escapingDisabled' });
        }
      },
    };
  },
});
