/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-disabled-template-escaping
 * Detects the JavaScript-side switches that turn off a template engine's HTML
 * auto-escaping (CWE-79):
 *
 *   view.escapeMarkup = false;                       // mustache: every {{value}} is raw HTML
 *   swig.setDefaults({ autoescape: false });         // swig
 *   new swig.Swig({ autoescape: false });            // swig
 *   nunjucks.configure('views', { autoescape: false });          // nunjucks
 *   new nunjucks.Environment(loader, { autoescape: false });     // nunjucks
 *   Handlebars.compile(source, { noEscape: true });  // handlebars
 *
 * EJS (`<%-`) and Pug (`!=`) disable escaping inside the template FILE, in
 * syntax ESLint never parses, so no JavaScript rule can see them. Only an
 * option passed from JavaScript is in reach, and that is what is matched.
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
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';

type MessageIds = 'escapingDisabled';

/**
 * @protocol-constant The option name the template engines read. A property
 * name, compared by exact equality, not inferred from a substring.
 */
const ESCAPE_OPTION = 'escapeMarkup';

/**
 * @protocol-constant Option names the engines read, each with the value that
 * turns escaping OFF. Compared by exact equality. `autoescape` (swig,
 * nunjucks) disables with `false`; `noEscape` (Handlebars) disables with `true`.
 */
const AUTOESCAPE_OPTION = 'autoescape';
const NO_ESCAPE_OPTION = 'noEscape';

/**
 * @protocol-constant The calls that take the engine's options object. The
 * option key alone is not enough to name an engine, so the object must be an
 * argument to one of these: swig `setDefaults` / `new Swig`, nunjucks
 * `configure` / `new Environment`.
 */
const AUTOESCAPE_CONSUMERS: ReadonlySet<string> = new Set([
  'setDefaults',
  'configure',
  'Swig',
  'Environment',
]);

/** Handlebars entry points that take `{ noEscape }`. */
const NO_ESCAPE_CONSUMERS: ReadonlySet<string> = new Set([
  'compile',
  'precompile',
]);

/** Assignment operators that can leave `escapeMarkup` false. */
const DISABLING_OPERATORS: ReadonlySet<string> = new Set(['=', '&&=', '??=']);

export const noDisabledTemplateEscaping = createRule<[], MessageIds>({
  name: 'no-disabled-template-escaping',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-disabled-template-escaping',
      description:
        'Disallows turning off template HTML auto-escaping: `escapeMarkup = false`, swig/nunjucks `autoescape: false`, Handlebars `noEscape: true` (CWE-79)',
      cwe: 'CWE-79',
      cweJustification:
        'CWE-79 (Improper Neutralization of Input During Web Page Generation) — escapeMarkup, autoescape and noEscape are the neutralization switch: turned off, the engine interpolates values into HTML verbatim, so any user-controlled value rendered through it is a cross-site scripting sink.',
      cvss: 6.1,
    },
    messages: {
      escapingDisabled: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Template auto-escaping disabled (CWE-79)',
        cwe: 'CWE-79',
        description:
          "{{option}} turns off the template engine's HTML escaping, so it renders every interpolated value as raw HTML. One user-controlled value in any template is then a cross-site scripting vulnerability.",
        severity: 'MEDIUM',
        fix: "Remove the option and keep auto-escaping on. Render trusted HTML through the template engine's explicit raw-output syntax at the one site that needs it, after sanitizing it.",
        documentationLink: 'https://cwe.mitre.org/data/definitions/79.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    /** Name of the function a call or `new` expression invokes, when static. */
    function calleeName(
      node: TSESTree.CallExpression | TSESTree.NewExpression,
    ): string | null {
      const { callee } = node;
      if (callee.type === AST_NODE_TYPES.Identifier) return callee.name;
      if (callee.type === AST_NODE_TYPES.MemberExpression) {
        return propertyName(callee);
      }
      return null;
    }

    /** Is `object` an argument of a call to one of `consumers`? */
    function passedTo(
      object: TSESTree.Node,
      consumers: ReadonlySet<string>,
    ): boolean {
      const call = object.parent as TSESTree.Node;
      if (
        call.type !== AST_NODE_TYPES.CallExpression &&
        call.type !== AST_NODE_TYPES.NewExpression
      ) {
        return false;
      }
      if (!call.arguments.includes(object as TSESTree.CallExpressionArgument)) {
        return false;
      }
      const name = calleeName(call);
      return name !== null && consumers.has(name);
    }

    /**
     * Is the options object handed to a consumer, directly or through the one
     * `const opts = {...}` it was declared in? A name used once between
     * declaration and call is how options are usually written down.
     */
    function reachesConsumer(
      object: TSESTree.ObjectExpression,
      consumers: ReadonlySet<string>,
    ): boolean {
      if (passedTo(object, consumers)) return true;
      const declarator = object.parent as TSESTree.Node;
      if (declarator.type !== AST_NODE_TYPES.VariableDeclarator) return false;
      const [variable] = context.sourceCode.getDeclaredVariables(declarator);
      return variable.references.some(
        (ref) => ref.isRead() && passedTo(ref.identifier, consumers),
      );
    }

    return {
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // `&&=` turns an enabled escape off and `??=` turns an unset (default)
        // one off; only `||=` leaves an enabled escape alone.
        if (
          !DISABLING_OPERATORS.has(node.operator) ||
          node.left.type !== AST_NODE_TYPES.MemberExpression ||
          node.right.type !== AST_NODE_TYPES.Literal ||
          node.right.value !== false
        ) {
          return;
        }
        const option = propertyName(node.left);
        if (option === ESCAPE_OPTION || option === AUTOESCAPE_OPTION) {
          context.report({
            node,
            messageId: 'escapingDisabled',
            data: { option },
          });
        }
      },
      Property(node: TSESTree.Property) {
        if (
          node.parent.type !== AST_NODE_TYPES.ObjectExpression ||
          node.value.type !== AST_NODE_TYPES.Literal
        ) {
          return;
        }
        const key = objectKeyName(node);
        if (
          key === AUTOESCAPE_OPTION &&
          node.value.value === false &&
          reachesConsumer(node.parent, AUTOESCAPE_CONSUMERS)
        ) {
          context.report({
            node,
            messageId: 'escapingDisabled',
            data: { option: key },
          });
        } else if (
          key === NO_ESCAPE_OPTION &&
          node.value.value === true &&
          reachesConsumer(node.parent, NO_ESCAPE_CONSUMERS)
        ) {
          context.report({
            node,
            messageId: 'escapingDisabled',
            data: { option: key },
          });
        }
      },
    };
  },
});
