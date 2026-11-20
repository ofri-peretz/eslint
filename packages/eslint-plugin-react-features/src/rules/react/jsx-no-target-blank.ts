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
function attributeText(value: TSESTree.JSXAttribute['value']): string | null {
  if (!value) return null;
  return staticString(
    value.type === 'JSXExpressionContainer' ? value.expression : value,
  );
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
          [attribute]
            .flat()
            .filter((a): a is string => typeof a === 'string'),
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

      /*
       * `target={"_self"}` names the same value as `target="_self"`, which is
       * in the valid set. `staticString` folds `Literal` and zero-expression
       * `TemplateLiteral` but does not unwrap a `JSXExpressionContainer`, so
       * the container is opened before folding and both spellings take the
       * same path. Only a target that is still not statically known after
       * that is "dynamic" and falls through to the fail-closed branch below.
       */
      const staticTarget = attributeText(targetAttr.value);
      if (staticTarget !== null) {
        // Browsing-context keywords are ASCII case-insensitive (HTML).
        return staticTarget.toLowerCase() === '_blank';
      }

      // Dynamic value - check enforceDynamicLinks option
      if (enforceDynamicLinks === 'always') {
        return true;
      }

      return false;
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

    // oxlint-disable-next-line consistent-function-scoping
    function hasNoopener(relAttr: TSESTree.JSXAttribute): boolean {
      const staticText2 = attributeText(relAttr.value);
      if (staticText2 !== null) {
        const relValues = staticText2.toLowerCase().split(/\s+/);
        return relValues.includes('noopener');
      }

      return false;
    }

    // oxlint-disable-next-line consistent-function-scoping
    function hasNoreferrer(relAttr: TSESTree.JSXAttribute): boolean {
      const staticText3 = attributeText(relAttr.value);
      if (staticText3 !== null) {
        const relValues = staticText3.toLowerCase().split(/\s+/);
        return relValues.includes('noreferrer');
      }

      return false;
    }

    // oxlint-disable-next-line consistent-function-scoping
    function hasSpreadAttribute(node: TSESTree.JSXOpeningElement): boolean {
      return node.attributes.some((attr) => attr.type === 'JSXSpreadAttribute');
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

        // Skip if spread attributes and not warning on them
        if (hasSpreadAttribute(node) && !warnOnSpreadAttributes) {
          return;
        }

        if (!hasTargetBlank(node)) {
          return;
        }

        // For links, only check external ones
        const urlAttributes = links ? linkAttributes.get(elementName) : undefined;
        if (urlAttributes && !hasExternalHref(node, urlAttributes)) {
          return;
        }

        const relAttr = getRelAttribute(node);
        const hasNoopenerValue = relAttr ? hasNoopener(relAttr) : false;
        const hasNoreferrerValue = relAttr ? hasNoreferrer(relAttr) : false;

        // noreferrer implies noopener in modern browsers
        if (hasNoopenerValue || hasNoreferrerValue) {
          // If allowReferrer is false, we need both noopener and noreferrer (or just noreferrer)
          if (!allowReferrer && !hasNoreferrerValue) {
            // Has noopener but not noreferrer - acceptable if allowReferrer is true
            return; // noopener is sufficient for security
          }
          return;
        }

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
