/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * What the rules that read other modules (`./export-map`) share: how a
 * module that does not parse is reported, and how an import name is read.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

import type { ExportMap } from './export-map';

/** `parseError`: the imported module does not parse. */
export const PARSE_ERROR_MESSAGE = formatLLMMessage({
  icon: MessageIcons.WARNING,
  issueName: 'Unparseable Module',
  description: "Parse errors in imported module '{{source}}': {{errors}}",
  severity: 'MEDIUM',
  fix: 'Fix the syntax error in that module, or map its extension to a parser that reads it (settings["import/parsers"])',
  documentationLink:
    'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/named.md',
});

/**
 * Report that the module `source` names does not parse, at `node`. Its
 * syntax errors are a finding of their own: nothing about that module can
 * be checked.
 */
export function reportParseErrors(
  context: Readonly<TSESLint.RuleContext<string, readonly unknown[]>>,
  node: TSESTree.Node,
  source: string,
  map: ExportMap,
): void {
  context.report({
    node,
    messageId: 'parseError',
    data: { source, errors: map.errorText() },
  });
}

/** An import or export name: an Identifier, or a string for an unspellable one. */
export const exportName = (
  node: TSESTree.Identifier | TSESTree.StringLiteral,
): string => (node.type === 'Identifier' ? node.name : node.value);

/**
 * Every identifier that reads the binding an import specifier declares. A
 * same-named parameter or local deeper in the file is another binding, and
 * its identifiers are not here.
 */
export function referencesOf(
  context: Readonly<TSESLint.RuleContext<string, readonly unknown[]>>,
  specifier: TSESTree.Node,
): Set<TSESTree.Node> {
  return new Set(
    context.sourceCode
      .getDeclaredVariables(specifier)
      .flatMap((variable) => variable.references.map((r) => r.identifier)),
  );
}
