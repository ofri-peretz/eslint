/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: jsx-no-target-blank
 * Enforce rel="noopener noreferrer" on anchor tags with target="_blank"
 *
 * Security: Prevents reverse tabnabbing attacks (CWE-1022)
 * @see https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/jsx-no-target-blank.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  staticString,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'noTargetBlank' | 'noRelWithoutNoopener';

type Options = {
  allowReferrer?: boolean;
  enforceDynamicLinks?: 'always' | 'never';
  warnOnSpreadAttributes?: boolean;
  links?: boolean;
  forms?: boolean;
};

type RuleOptions = [Options?];

/**
 * The static text of an attribute value: `"x"`, `{"x"}` and `` {`x`} `` all
 * name `x`. `null` when the value is not statically known.
 */
function attributeText(
  value: NonNullable<TSESTree.JSXAttribute['value']>,
): string | null {
  return staticString(
    value.type === 'JSXExpressionContainer' ? value.expression : value,
  );
}

type Blankness = 'blank' | 'dynamic' | 'no';

/**
 * Is this `target` expression `_blank`? A ternary is `_blank` when either
 * branch is, and not a target at all when both branches are known and
 * neither is (`cond ? "_self" : ""`, `cond ? undefined : null`). Anything
 * the file does not spell out is `dynamic`.
 */
function blankness(expr: TSESTree.Node): Blankness {
  const text = staticString(expr);
  if (text !== null) return text.toLowerCase() === '_blank' ? 'blank' : 'no';
  if (
    (expr.type === 'Literal' && expr.value === null) ||
    (expr.type === 'Identifier' && expr.name === 'undefined')
  )
    return 'no';
  if (expr.type === 'ConditionalExpression') {
    const a = blankness(expr.consequent);
    const b = blankness(expr.alternate);
    if (a === 'blank' || b === 'blank') return 'blank';
    return a === 'dynamic' || b === 'dynamic' ? 'dynamic' : 'no';
  }
  return 'dynamic';
}

/**
 * The `rel` values that can reach the browser together with a `_blank`
 * target; `null` stands for a value nothing here proves safe. A ternary `rel`
 * keyed on the same condition as a ternary `target` is read on the branch
 * where the target is `_blank` (`t ? "_blank" : undefined` pairs with
 * `t ? "noreferrer" : undefined`).
 */
function relValues(
  rel: TSESTree.JSXAttribute['value'],
  target: TSESTree.JSXAttribute['value'] | undefined,
  textOf: (node: TSESTree.Node) => string,
): (string | null)[] {
  const expr = rel?.type === 'JSXExpressionContainer' ? rel.expression : rel;
  if (!expr) return [null];
  const text = staticString(expr);
  if (text !== null) return [text];
  if (expr.type !== 'ConditionalExpression') return [null];
  const branches = [expr.consequent, expr.alternate].map((b) =>
    staticString(b),
  );
  const targetExpr =
    target?.type === 'JSXExpressionContainer' ? target.expression : undefined;
  if (
    targetExpr?.type === 'ConditionalExpression' &&
    textOf(targetExpr.test) === textOf(expr.test)
  ) {
    const blankAt = [targetExpr.consequent, targetExpr.alternate].findIndex(
      (b) => staticString(b)?.toLowerCase() === '_blank',
    );
    return [blankAt === -1 ? null : branches[blankAt]];
  }
  return branches;
}

/**
 * The elements a rule treats as links (or forms) and the attribute that holds
 * the URL, as eslint-plugin-react reads them: the built-in `a` / `form`, then
 * `settings.linkComponents` / `settings.formComponents`, each a name or
 * `{ name, linkAttribute }` (the attribute a string or a list of strings).
 */
function componentAttributes(
  settings: unknown,
  key: 'linkComponents' | 'formComponents',
  attributeKey: 'linkAttribute' | 'formAttribute',
  builtIn: string,
  builtInAttribute: string,
): Map<string, readonly string[]> {
  const found = new Map<string, readonly string[]>([
    [builtIn, [builtInAttribute]],
  ]);
  const configured = (settings as Record<string, unknown> | undefined)?.[key];
  const entries: unknown[] = Array.isArray(configured)
    ? configured
    : configured === undefined
      ? []
      : [configured];
  for (const entry of entries) {
    if (typeof entry === 'string') {
      found.set(entry, [builtInAttribute]);
    } else if (entry && typeof entry === 'object') {
      const { name, [attributeKey]: attribute } = entry as Record<
        string,
        unknown
      >;
      if (typeof name === 'string') {
        found.set(
          name,
          [attribute].flat().filter((a): a is string => typeof a === 'string'),
        );
      }
    }
  }
  return found;
}

export const jsxNoTargetBlank = createRule<RuleOptions, MessageIds>({
  name: 'jsx-no-target-blank',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/jsx-no-target-blank',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/jsx-no-target-blank.md',
      description: 'Forbid target="_blank" without rel="noopener noreferrer"',
      cwe: 'CWE-1022',
      cvss: 7.5,
    },
    fixable: 'code',
    messages: {
      noTargetBlank: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe target="_blank"',
        cwe: 'CWE-1022',
        description:
          'Using target="_blank" without rel="noopener noreferrer" is a security risk',
        severity: 'HIGH',
        fix: 'Add rel="noopener noreferrer" to prevent reverse tabnabbing',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/jsx-no-target-blank.md',
      }),
      noRelWithoutNoopener: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing noopener',
        cwe: 'CWE-1022',
        description: 'rel attribute is missing "noopener" value',
        severity: 'MEDIUM',
        fix: 'Add "noopener" to the rel attribute',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/jsx-no-target-blank.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowReferrer: { type: 'boolean', default: false },
          enforceDynamicLinks: {
            type: 'string',
            enum: ['always', 'never'],
            default: 'always',
          },
          warnOnSpreadAttributes: { type: 'boolean', default: false },
          links: { type: 'boolean', default: true },
          forms: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let allowReferrer: boolean;
    let enforceDynamicLinks: 'always' | 'never';
    let warnOnSpreadAttributes: boolean;
    let links: boolean;
    let forms: boolean;
    /** Link components and the attributes that hold their URL: `a` plus `settings.linkComponents`. */
    let linkAttributes: Map<string, readonly string[]>;
    let elementsToCheck: string[];

    function hasTargetBlank(node: TSESTree.JSXOpeningElement): boolean {
      const targetAttr = node.attributes.find(
        (attr): attr is TSESTree.JSXAttribute =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'target',
      );

      if (!targetAttr || !targetAttr.value) return false;

      // `target={"_self"}` names the same value as `target="_self"`, and a
      // ternary is read branch by branch (see `blankness`). Only a target that
      // is still not known after that is "dynamic" and falls to the
      // fail-closed `enforceDynamicLinks` default.
      const kind = blankness(
        targetAttr.value.type === 'JSXExpressionContainer'
          ? targetAttr.value.expression
          : targetAttr.value,
      );
      return (
        kind === 'blank' ||
        (kind === 'dynamic' && enforceDynamicLinks === 'always')
      );
    }

    function hasExternalHref(
      node: TSESTree.JSXOpeningElement,
      attributeNames: readonly string[],
    ): boolean {
      return attributeNames.some((attributeName) => {
        const hrefAttr = node.attributes.find(
          (attr): attr is TSESTree.JSXAttribute =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            attr.name.name === attributeName,
        );

        if (!hrefAttr || !hrefAttr.value) return false;

        const href = attributeText(hrefAttr.value);
        if (href !== null) {
          // External if it starts with http:// or https:// (a URL scheme is
          // case-insensitive) or is protocol-relative //
          return /^(https?:)?\/\//i.test(href);
        }

        // Dynamic href - assume external
        return enforceDynamicLinks === 'always';
      });
    }

    function getRelAttribute(
      node: TSESTree.JSXOpeningElement,
    ): TSESTree.JSXAttribute | undefined {
      return node.attributes.find(
        (attr): attr is TSESTree.JSXAttribute =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'rel',
      );
    }

    return {
      before() {
        const [options = {} as Options] = currentOptions();
        ({
          allowReferrer = false,
          enforceDynamicLinks = 'always',
          warnOnSpreadAttributes = false,
          links = true,
          forms = false,
        } = options ?? ({} as Options));

        linkAttributes = componentAttributes(
          context.settings,
          'linkComponents',
          'linkAttribute',
          'a',
          'href',
        );
        elementsToCheck = [];
        if (links) elementsToCheck.push(...linkAttributes.keys());
        if (forms) {
          elementsToCheck.push(
            ...componentAttributes(
              context.settings,
              'formComponents',
              'formAttribute',
              'form',
              'action',
            ).keys(),
          );
        }
      },
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        // `Link`, or `Foo.Link` / `ns:link` as a setting spells it
        const elementName =
          node.name.type === 'JSXIdentifier'
            ? node.name.name
            : context.sourceCode.getText(node.name);
        if (!elementsToCheck.includes(elementName)) {
          return;
        }

        // A spread may carry `target`, the URL or `rel`; unless asked to
        // warn about that, such an element is left alone.
        const spreadAt = node.attributes.findLastIndex(
          (attr) => attr.type === 'JSXSpreadAttribute',
        );
        if (spreadAt !== -1 && !warnOnSpreadAttributes) {
          return;
        }
        const warnSpread = spreadAt !== -1;

        // With a spread in play the target may arrive through it
        if (!warnSpread && !hasTargetBlank(node)) {
          return;
        }

        // For links, only check external ones; an attribute written before
        // the spread can be overridden by it
        const urlAttributes = links
          ? linkAttributes.get(elementName)
          : undefined;
        if (urlAttributes && !hasExternalHref(node, urlAttributes)) {
          const urlAt = node.attributes.findLastIndex(
            (attr) =>
              attr.type === 'JSXAttribute' &&
              attr.name.type === 'JSXIdentifier' &&
              urlAttributes.includes(attr.name.name),
          );
          if (!(warnSpread && urlAt < spreadAt)) return;
        }

        const relAttr = getRelAttribute(node);
        const targetAttr = node.attributes.find(
          (attr): attr is TSESTree.JSXAttribute =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            attr.name.name === 'target',
        );
        const overridable =
          warnSpread &&
          relAttr !== undefined &&
          node.attributes.indexOf(relAttr) < spreadAt;
        // noreferrer implies noopener in modern browsers, and noopener is enough on its own
        const secure =
          relAttr !== undefined &&
          !overridable &&
          relValues(relAttr.value, targetAttr?.value, (n) =>
            context.sourceCode.getText(n),
          ).every((value) => {
            const tokens = value?.toLowerCase().split(/\s+/) ?? [];
            return tokens.includes('noopener') || tokens.includes('noreferrer');
          });
        if (secure) return;

        // Missing rel or rel doesn't have noopener/noreferrer
        context.report({
          node,
          messageId: relAttr ? 'noRelWithoutNoopener' : 'noTargetBlank',
          fix: (fixer: TSESLint.RuleFixer) => {
            if (relAttr && relAttr.value && relAttr.value.type === 'Literal') {
              // Add noopener noreferrer to existing rel
              const currentRel = String(staticString(relAttr.value));
              const newRel = allowReferrer
                ? `${currentRel} noopener`.trim()
                : `${currentRel} noopener noreferrer`.trim();
              return fixer.replaceText(relAttr.value, `"${newRel}"`);
            } else if (!relAttr) {
              // Add rel attribute
              const lastAttr = node.attributes[node.attributes.length - 1];
              const relValue = allowReferrer
                ? 'noopener'
                : 'noopener noreferrer';
              if (lastAttr) {
                return fixer.insertTextAfter(lastAttr, ` rel="${relValue}"`);
              }
              return fixer.insertTextAfter(node.name, ` rel="${relValue}"`);
            }
            return null;
          },
        });
      },
    };
  },
});
