/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: react-in-jsx-scope
 * Ensure React is in scope
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'reactInJsxScope';

export const reactInJsxScope = createRule<[], MessageIds>({
  name: 'react-in-jsx-scope',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/react-in-jsx-scope',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/react-in-jsx-scope.md',
      description: 'Ensure React is in scope',
    },
    schema: [],
    messages: {
      reactInJsxScope: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'React Not in Scope',
        description: 'React must be in scope when using JSX',
        severity: 'CRITICAL',
        fix: 'Add import React from "react" at the top of the file',
        documentationLink:
          'https://react.dev/learn/add-react-to-a-website#optional-using-jsx-without-a-build-step',
      }),
    },
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, []>) {
    /**
     * `/** @jsxRuntime automatic *\/`: the file compiles JSX to the automatic
     * runtime's own imports, so it needs no `React` binding.
     */
    let automatic: boolean;

    /**
     * Does this definition leave a runtime value? A type alias / interface
     * does not, and neither does a type-only import (`import type React`,
     * `import { type default as React }`): both are erased at compile time.
     */
    function declaresValue(def: TSESLint.Scope.Definition): boolean {
      if (def.type === 'Type') return false;
      if (def.type !== 'ImportBinding') return true;
      const declaration = def.parent as { importKind?: string };
      const specifier = def.node as { importKind?: string };
      return (
        declaration.importKind !== 'type' && specifier.importKind !== 'type'
      );
    }

    /** Is a value named `React` declared in this scope or an enclosing one? */
    function reactInScope(scope: TSESLint.Scope.Scope): boolean {
      for (
        let s: TSESLint.Scope.Scope | null = scope;
        s !== null;
        s = s.upper
      ) {
        const variable = s.set.get('React');
        if (variable?.defs.some(declaresValue)) return true;
      }
      return false;
    }

    function check(
      node: TSESTree.JSXOpeningElement | TSESTree.JSXOpeningFragment,
    ): void {
      if (automatic || reactInScope(context.sourceCode.getScope(node))) return;
      context.report({
        node: node.type === 'JSXOpeningElement' ? node.name : node,
        messageId: 'reactInJsxScope',
      });
    }

    return {
      Program() {
        automatic = context.sourceCode
          .getAllComments()
          .some((c) => /@jsxRuntime\s+automatic\b/.test(c.value));
      },
      JSXOpeningElement: check,
      JSXOpeningFragment: check,
    };
  },
});
