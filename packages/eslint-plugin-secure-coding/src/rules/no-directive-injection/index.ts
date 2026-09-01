/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-directive-injection
 * Detects directive injection vulnerabilities (CWE-96)
 *
 * Directive injection occurs when user input is used to inject malicious
 * directives into template systems (Angular, Vue, React, etc.). Attackers
 * can inject directives that execute arbitrary code or manipulate the DOM.
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe directive usage patterns
 * - Trusted directive sources
 * - JSDoc annotations (@trusted-directive, @safe-template)
 * - Framework-specific safe patterns
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, unwrapTypeSyntax, staticString, propertyName } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'directiveInjection'
  | 'unsafeDirectiveName'
  | 'dynamicDirectiveCreation'
  | 'templateInjection'
  | 'unsafeComponentBinding'
  | 'userControlledTemplate'
  | 'dangerousInnerHTML'
  | 'unsafeSanitizerConfig';

/**
 * `trustedDirectives`, `frameworks` and `allowDynamicInComponents` used to be
 * declared here and in `meta.schema`. None was ever read by `create()`. The
 * framework vocabulary the rule actually uses is the module-scope
 * `DANGEROUS_TAGS`/attribute sets below; `frameworks` named a knob that was
 * wired to nothing.
 */
export interface Options extends SecurityRuleOptions {
  /** Variables that contain user input */
  userInputVariables?: string[];
}

type RuleOptions = [Options?];

/**
 * Elements DOMPurify strips because allowing them defeats sanitization
 * outright: each can execute script or retarget every relative URL on the page.
 *
 * @protocol-constant These are HTML element names from the WHATWG spec, matched
 * against the string values a caller passes to DOMPurify's own `ADD_TAGS` /
 * `ALLOWED_TAGS` configuration — a closed markup surface, not a vocabulary a
 * consumer's domain can collide with. The rule exists to report exactly the
 * moment one of these five is re-allowed, so a consumer who could edit the set
 * could delete `script` and keep a green lint run on `ADD_TAGS: ['script']`,
 * which is the single configuration this rule was written to catch.
 */
const DANGEROUS_TAGS = new Set(['script', 'iframe', 'object', 'embed', 'base']);

/**
 * Attributes that carry executable or navigable content. Every `on*` handler is
 * covered separately by prefix, since the list of DOM events is open-ended.
 *
 * @protocol-constant These are HTML/SVG attribute names from the WHATWG and SVG
 * specifications, matched against the values a caller passes to DOMPurify's
 * `ADD_ATTR` / `ALLOWED_ATTR` — the spec decides what they mean, not the
 * consuming codebase. Making them editable would let a consumer re-allow
 * `srcdoc` or `formaction`, the two attributes that turn a sanitized document
 * back into an execution sink, and silence the rule on its own canonical shape.
 */
const DANGEROUS_ATTRS = new Set(['srcdoc', 'formaction', 'xlink:href']);

/** DOMPurify options that widen what survives sanitization. */
const TAG_OPTIONS = new Set(['ADD_TAGS', 'ALLOWED_TAGS']);
const ATTR_OPTIONS = new Set(['ADD_ATTR', 'ALLOWED_ATTR']);

/** The string values of an array literal; `null` when it is not a literal array. */
function staticStringArray(node: TSESTree.Node): string[] | null {
  if (node.type !== 'ArrayExpression') return null;
  const out: string[] = [];
  for (const element of node.elements) {
    if (element?.type === 'Literal' && typeof element.value === 'string') {
      out.push(element.value);
    }
  }
  return out;
}

/**
 * Is this a `…sanitize(html, { … })` call whose options re-enable something the
 * sanitizer removes by default?
 *
 * Returns the offending option and value so the message can name both — a
 * reader needs to know *which* entry is the problem, not just that one exists.
 *
 * Only a receiver whose name mentions "purify" qualifies, so an unrelated
 * `validator.sanitize(input, opts)` is never considered.
 */
function findUnsafeSanitizerConfig(
  node: TSESTree.CallExpression,
): { node: TSESTree.Node; option: string; allowed: string } | null {
  const callee = node.callee;
  if (callee.type !== 'MemberExpression') return null;
  if (callee.property.type !== 'Identifier' || callee.property.name !== 'sanitize') return null;
  if (callee.object.type !== 'Identifier') return null;
  if (!callee.object.name.toLowerCase().includes('purify')) return null;

  const config = node.arguments[1];
  if (!config || config.type !== 'ObjectExpression') return null;

  for (const property of config.properties) {
    if (property.type !== 'Property') continue;
    // A computed key is a variable, so its text is not the option name.
    if (property.computed) continue;
    // `{ 'ADD_TAGS': … }` names the same option as `{ ADD_TAGS: … }`; reading
    // only Identifier keys would have let quoting slip past the check.
    const option =
      property.key.type === 'Identifier'
        ? property.key.name
        : staticString(property.key) !== null
          ? staticString(property.key)
          : null;
    if (option === null) continue;

    // `{ ALLOWED_TAGS }` shorthand names a constant defined elsewhere. Its
    // contents are unknowable here, and assuming the worst is what produced
    // the reported false positive — so shorthand is left alone.
    if (property.shorthand) continue;

    const values = staticStringArray(property.value);
    if (!values) continue;

    if (TAG_OPTIONS.has(option)) {
      const bad = values.find((v) => DANGEROUS_TAGS.has(v.toLowerCase()));
      if (bad) return { node: property, option, allowed: `<${bad}>` };
    }

    if (ATTR_OPTIONS.has(option)) {
      const bad = values.find(
        (v) => v.toLowerCase().startsWith('on') || DANGEROUS_ATTRS.has(v.toLowerCase()),
      );
      if (bad) return { node: property, option, allowed: `the "${bad}" attribute` };
    }
  }

  return null;
}

export const noDirectiveInjection = createRule<RuleOptions, MessageIds>({
  name: 'no-directive-injection',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-directive-injection.md',
      description: 'Detects directive injection vulnerabilities in templates',
      cwe: 'CWE-96',
    },
    messages: {
      directiveInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Directive Injection',
        cwe: 'CWE-96',
        description: 'User input injected into directive or template',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/96.html',
      }),
      unsafeDirectiveName: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Directive Name',
        cwe: 'CWE-96',
        description: 'Directive name controlled by user input',
        severity: 'CRITICAL',
        fix: 'Use hardcoded directive names or validate against whitelist',
        documentationLink: 'https://cwe.mitre.org/data/definitions/96.html',
      }),
      dynamicDirectiveCreation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dynamic Directive Creation',
        cwe: 'CWE-96',
        description: 'Dynamic creation of directives from user input',
        severity: 'HIGH',
        fix: 'Validate directive names against trusted list',
        documentationLink: 'https://cwe.mitre.org/data/definitions/96.html',
      }),
      templateInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Template Injection',
        cwe: 'CWE-96',
        description: 'User input injected into template content',
        severity: 'HIGH',
        fix: 'Sanitize template input or use safe rendering',
        documentationLink: 'https://cwe.mitre.org/data/definitions/96.html',
      }),
      unsafeComponentBinding: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Component Binding',
        cwe: 'CWE-96',
        description: 'Dynamic component binding with user input',
        severity: 'HIGH',
        fix: 'Use component whitelist or validate component names',
        documentationLink: 'https://cwe.mitre.org/data/definitions/96.html',
      }),
      userControlledTemplate: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'User Controlled Template',
        cwe: 'CWE-96',
        description: 'Template content controlled by user input',
        severity: 'CRITICAL',
        fix: 'Sanitize template input before compilation',
        documentationLink: 'https://cwe.mitre.org/data/definitions/96.html',
      }),
      dangerousInnerHTML: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dangerous innerHTML',
        cwe: 'CWE-96',
        description: 'innerHTML set with user-controlled content',
        severity: 'HIGH',
        fix: 'Use textContent or sanitize HTML content',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML',
      }),
      unsafeSanitizerConfig: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Sanitizer configured to allow {{allowed}}',
        cwe: 'CWE-96',
        description:
          'DOMPurify was configured with {{option}} re-enabling {{allowed}}, which is exactly what the sanitizer removes by default. The call returns markup that can execute script, so the sanitization provides no protection.',
        severity: 'HIGH',
        fix: 'Drop {{allowed}} from {{option}}. If the markup genuinely needs it, render it outside the sanitized region rather than widening the allow-list.',
        documentationLink: 'https://github.com/cure53/DOMPurify#can-i-configure-dompurify',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          userInputVariables: {
            type: 'array',
            items: { type: 'string' },
            default: ['req', 'request', 'body', 'query', 'params', 'input', 'data', 'userInput'], description: 'Variable names treated as user-controlled input'
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as template sanitizers',
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional JSDoc annotations to consider as safe markers',
          },
          strictMode: {
            type: 'boolean',
            default: false,
            description: 'Disable all false positive detection (strict mode)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      userInputVariables: ['req', 'request', 'body', 'query', 'params', 'input', 'data', 'userInput'],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      userInputVariables = ['req', 'request', 'body', 'query', 'params', 'input', 'data', 'userInput'],
      trustedSanitizers = [],
      trustedAnnotations = [],
      strictMode = false,
    }: Options = options;

    const sourceCode = context.sourceCode;
    const filename = context.filename;

    // Create safety checker for false positive detection
    const safetyChecker = createSafetyChecker({
      trustedSanitizers,
      trustedAnnotations,
      trustedOrmPatterns: [],
      strictMode,
    });

    /**
     * Is this identifier one the project declared as user input?
     *
     * WHOLE NAMES, never substrings. `varName.includes(input)` over a list
     * containing `data`, `body`, `input` and `params` made `metadata`,
     * `renderMetadata`, `bodyClass` and `validationParams` all read as
     * attacker-controlled, and `varName.startsWith('user')` added `userAgent`,
     * `username` and `userPreferences`. Measured on the printed source of an
     * expression, which is how `chart.innerHTML = renderMetadata(series)` came
     * to be a CWE-96 finding.
     */
    const declaredUserInput: ReadonlySet<string> = new Set(
      userInputVariables.map((name) => name.toLowerCase()),
    );
    const namesUserInput = (varName: string): boolean =>
      declaredUserInput.has(varName.toLowerCase());

    /**
     * Every name along a member chain, plus its root identifier.
     *
     * `req.body.template` -> ['req', 'body', 'template'], so a declared name
     * anywhere in the chain counts and `paymentData.total` matches nothing.
     * A computed access contributes no name but does not stop the walk, so
     * `req.query[key]` is still rooted at `req`.
     */
    const memberChainNames = (node: TSESTree.MemberExpression): string[] => {
      const names: string[] = [];
      let current: TSESTree.Node = node;
      while (current.type === 'MemberExpression') {
        if (!current.computed && current.property.type === 'Identifier') {
          names.push(current.property.name);
        }
        current = current.object;
      }
      if (current.type === 'Identifier') names.push(current.name);
      return names;
    };

    /**
     * Does this binding hold a value that came from user input?
     *
     * Answered from the scope manager, not from the binding's spelling:
     * `const source = req.body.markup` taints `source`, and so does a later
     * `source = req.query.tpl`. A binding whose every write is a literal stays
     * clean however it is named.
     */
    const resolvesToUserInput = (
      node: TSESTree.Identifier,
      seen: Set<string>,
    ): boolean => {
      if (seen.has(node.name)) return false;
      seen.add(node.name);

      let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
      while (scope) {
        const variable = scope.variables.find((v) => v.name === node.name);
        if (variable) {
          return variable.references.some(
            (reference) =>
              reference.writeExpr !== undefined &&
              reference.writeExpr !== null &&
              isUserInputExpression(reference.writeExpr, seen),
          );
        }
        scope = scope.upper;
      }
      return false;
    };

    /**
     * A bare function PARAMETER in the template-source position.
     *
     * Provenance the file cannot see, at the one sink where that is enough on
     * its own: a rendering service whose HTTP layer lives elsewhere is the
     * ordinary shape, and `Handlebars.compile` has exactly one safe usage —
     * compile a template the application owns. A parameter is not one, and
     * nothing in this file can narrow it to one.
     *
     * Deliberately NOT applied to `innerHTML` or `dangerouslySetInnerHTML`,
     * where a parameter is the normal shape of a DOM helper whose caller did
     * the sanitizing, and where reporting it would fire on every such helper.
     *
     * Resolved through the scope manager's definition kind, so it is the
     * binding that decides and not the parameter's spelling — which is what the
     * previous test (`name.includes('input')`) actually measured.
     */
    const isUnattributedParameter = (raw: TSESTree.Node): boolean => {
      const node = unwrapTypeSyntax(raw);
      if (node.type !== 'Identifier') return false;

      let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
      while (scope) {
        const variable = scope.variables.find((v) => v.name === node.name);
        if (variable) {
          return variable.defs.some((def) => def.type === 'Parameter');
        }
        scope = scope.upper;
      }
      return false;
    };

    /**
     * Is this EXPRESSION attacker-attributable?
     *
     * The rule used to answer this by printing the expression and searching the
     * text for a word, which failed in both directions at once:
     * `Handlebars.compile(req.body.template)` — the canonical CWE-96 sink,
     * written the way Handlebars' own documentation writes it — was silent,
     * because only a bare `Identifier` was ever considered; while
     * `renderMetadata(series)` reported, because its text contains `data`.
     *
     * A CallExpression is deliberately not attributable: a helper's return
     * value has provenance this rule cannot see from one site, and treating it
     * as tainted is what reported the sanitizers. Same reasoning
     * `no-sql-injection` documents for its own call exclusion.
     */
    function isUserInputExpression(
      raw: TSESTree.Node,
      seen: Set<string> = new Set(),
    ): boolean {
      const node = unwrapTypeSyntax(raw);

      switch (node.type) {
        case 'Identifier':
          return namesUserInput(node.name) || resolvesToUserInput(node, seen);
        case 'MemberExpression':
          return memberChainNames(node).some(namesUserInput);
        case 'TemplateLiteral':
          return node.expressions.some((expr) => isUserInputExpression(expr, seen));
        case 'BinaryExpression':
          return (
            isUserInputExpression(node.left, seen) ||
            isUserInputExpression(node.right, seen)
          );
        case 'ConditionalExpression':
          return (
            isUserInputExpression(node.consequent, seen) ||
            isUserInputExpression(node.alternate, seen)
          );
        case 'LogicalExpression':
          return (
            isUserInputExpression(node.left, seen) ||
            isUserInputExpression(node.right, seen)
          );
        case 'ObjectExpression':
          // `dangerouslySetInnerHTML={{ __html: … }}` — the payload is the
          // property value, so the object is tainted exactly when one of its
          // values is.
          return node.properties.some(
            (property) =>
              property.type === 'Property' &&
              isUserInputExpression(property.value, seen),
          );
        default:
          return false;
      }
    }

    return {
      // Check JSX attributes for directive injection
      JSXAttribute(node: TSESTree.JSXAttribute) {
        const attrName = node.name;
        const attrValue = node.value;

        // Check for dangerouslySetInnerHTML
        if (attrName.type === 'JSXIdentifier' && attrName.name === 'dangerouslySetInnerHTML') {
          if (attrValue && attrValue.type === 'JSXExpressionContainer') {
            const expression = attrValue.expression;

            // Check if the expression contains user input
            if (isUserInputExpression(expression)) {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: attrValue,
                messageId: 'dangerousInnerHTML',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }

        // Check for dynamic directive names (Angular/Vue style)
        // Check for dynamic directive names (Angular/Vue style)
        const isNamespaceDirective = (
          (attrName.type === 'JSXNamespacedName' && (attrName.namespace.name === 'v' || attrName.namespace.name === 'ng')) ||
          (attrName.type === 'JSXIdentifier' && (attrName.name.startsWith('ng:') || attrName.name.startsWith('v:')))
        );

        if (isNamespaceDirective && attrValue) {
            if (attrValue.type === 'JSXExpressionContainer') {
              const expression = attrValue.expression;

              // Check if directive value comes from user input
              if (isUserInputExpression(expression)) {
                if (safetyChecker.isSafe(node, context)) {
                  return;
                }

                context.report({
                  node: attrValue,
                  messageId: 'directiveInjection',
                  data: {
                    filePath: filename,
                    line: String(node.loc?.start.line ?? 0),
                    severity: 'HIGH',
                    safeAlternative: 'Use hardcoded directive values or validate user input',
                  },
                });
              }
            }
        }

        // Check for dynamic component binding (React/Angular)
        if (attrName.type === 'JSXIdentifier') {
          const attrNameStr = attrName.name;

          // Check for is="" (dynamic component in Vue/Angular)
          if (attrNameStr === 'is' && attrValue) {
            if (attrValue.type === 'JSXExpressionContainer') {
              const expression = attrValue.expression;

              if (isUserInputExpression(expression)) {
                if (safetyChecker.isSafe(node, context)) {
                  return;
                }

                context.report({
                  node: attrValue,
                  messageId: 'unsafeComponentBinding',
                  data: {
                    filePath: filename,
                    line: String(node.loc?.start.line ?? 0),
                },
                });
              }
            }
          }
        }
      },

      // Check for innerHTML assignments
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        const left = node.left;
        const right = node.right;

        // Check for element.innerHTML = userInput
        if (left.type === 'MemberExpression' &&
            propertyName(left) === 'innerHTML') {
          // A sanitizer call IS the documented fix for this defect, so reporting
          // `node.innerHTML = DOMPurify.sanitize(html, { ALLOWED_TAGS: [...] })` tells the
          // reader to do what they already did. Only skip when the config is not one of the
          // known-unsafe widenings — findUnsafeSanitizerConfig still catches
          // `{ ADD_TAGS: ['script'] }` and friends, which are reported elsewhere.
          const isSanitizedValue =
            right.type === 'CallExpression' &&
            right.callee.type === 'MemberExpression' &&
            propertyName(right.callee) === 'sanitize' &&
            findUnsafeSanitizerConfig(right) === null;

          if (isSanitizedValue) {
            return;
          }

          // Check if right side contains user input
          if (isUserInputExpression(right)) {
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node: right,
              messageId: 'dangerousInnerHTML',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }
      },

      // Check for template compilation with user input
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // A DOMPurify config that re-adds what DOMPurify exists to strip.
        //
        // `DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR })` — the
        // configured allow-list the issue reported as a false positive — is
        // correct and is NOT reported: an allow-list naming no dangerous
        // element is the answer the rule steers people toward. What is
        // reported is an allow-list that puts `script`, `iframe`, `object`,
        // `embed` or `base` back, or that re-enables an `on*` handler or a
        // URL-bearing attribute. Those turn the call into a no-op that still
        // reads as sanitized at the call site.
        const unsafeConfig = findUnsafeSanitizerConfig(node);
        if (unsafeConfig) {
          context.report({
            node: unsafeConfig.node,
            messageId: 'unsafeSanitizerConfig',
            data: { option: unsafeConfig.option, allowed: unsafeConfig.allowed },
          });
        }

        // Check for template compilation functions
        if (callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier') {
          const methodName = callee.property.name;
          const objectName = callee.object.type === 'Identifier' ? callee.object.name : '';

          // Template compilation functions
          if (['compile', 'template', '$compile', '$interpolate'].includes(methodName) ||
              (objectName === 'Handlebars' && methodName === 'compile') ||
              (objectName === '_' && methodName === 'template') ||
              (objectName === 'ejs' && methodName === 'render') ||
              (objectName === 'pug' && methodName === 'render') ||
              (objectName === 'mustache' && methodName === 'render')) {
            const args = node.arguments;
            if (args.length > 0) {
              const templateArg = args[0];

              // Check if template comes from user input
              if (
                isUserInputExpression(templateArg) ||
                isUnattributedParameter(templateArg)
              ) {
                if (safetyChecker.isSafe(node, context)) {
                  return;
                }

                context.report({
                  node: templateArg,
                  messageId: 'userControlledTemplate',
                  data: {
                    filePath: filename,
                    line: String(node.loc?.start.line ?? 0),
                  },
                });
              }
            }
          }

          // Check for Vue.js v-html directive
          if (objectName === 'Vue' && methodName === 'directive') {
            const args = node.arguments;
            if (args.length >= 2) {
              const directiveName = args[0];

              if (isUserInputExpression(directiveName)) {
                if (safetyChecker.isSafe(node, context)) {
                  return;
                }

                context.report({
                  node: directiveName,
                  messageId: 'unsafeDirectiveName',
                  data: {
                    filePath: filename,
                    line: String(node.loc?.start.line ?? 0),
                  },
                });
              }
            }
          }
        }

        // Check for Angular directive creation
        if (callee.type === 'Identifier' && callee.name === 'directive') {
          const args = node.arguments;
          if (args.length >= 2) {
            const directiveName = args[0];

            if (isUserInputExpression(directiveName)) {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: directiveName,
                messageId: 'dynamicDirectiveCreation',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }
      },

      // Check template literals for injection
      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        // Check if template literal is used dangerously
        let current: TSESTree.Node | undefined = node;
        let isInDangerousContext = false;

        // One defect, one finding. `el.innerHTML = `<p>${req.body.name}</p>``
        // reported TWICE — once from the AssignmentExpression visitor, whose
        // taint check already looks through a template literal, and again from
        // here. The owning visitor reports the whole payload, so this one stands
        // down whenever that payload is itself attributable.
        //
        // What is left for this visitor is the case the owning visitors
        // deliberately cannot see: a template handed to a helper first, as in
        // `el.innerHTML = wrap(`${req.body.name}`)`. A call's return value has
        // no provenance, so the assignment is quiet and the interpolation here
        // is the only evidence there is.
        //
        // Every assignment of `isInDangerousContext = true` is followed by `break`,
        // so the negation is dead (CodeQL: `js/useless-conditional`).
        while (current) {
          if (current.type === 'JSXExpressionContainer') {
            // Check if we are inside dangerouslySetInnerHTML attribute
            if (current.parent?.type === 'JSXAttribute' &&
                current.parent.name.type === 'JSXIdentifier' &&
                current.parent.name.name === 'dangerouslySetInnerHTML') {
              // A synthetic node may carry no expression at all; absence is not evidence.
              if (current.expression && isUserInputExpression(current.expression)) return;
              isInDangerousContext = true;
              break;
            }
          } else if (current.type === 'AssignmentExpression') {
            // Check for innerHTML assignment
            const left = current.left;
            if (left.type === 'MemberExpression' &&
                propertyName(left) === 'innerHTML') {
              if (current.right && isUserInputExpression(current.right)) return;
              isInDangerousContext = true;
              break;
            }
          }
          current = current.parent as TSESTree.Node;
        }

        if (isInDangerousContext) {
          // Check if template contains user input
          const hasUserInput = node.expressions.some((expr: TSESTree.Expression) =>
            isUserInputExpression(expr),
          );

          if (hasUserInput) {
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node,
              messageId: 'templateInjection',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
                severity: 'HIGH',
                safeAlternative: 'Sanitize template input before insertion',
              },
            });
          }
        }
      }
    };
  },
});
