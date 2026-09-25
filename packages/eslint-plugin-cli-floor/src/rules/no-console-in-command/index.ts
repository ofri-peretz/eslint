/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Command code writes through the output layer, never `console.*`
 * @description burgee requirement O3. `--json` (O1) and the quiet non-TTY mode
 * (O2) only hold if every byte a command prints goes through one place that
 * knows about them. A `console.log` in a handler is a line of prose in the
 * middle of a JSON document — the drift oclif/core #1644 shows when this is
 * not enforced.
 *
 * Reports a call on the global `console` lexically inside a proven command
 * handler: commander `.action()`, a yargs command handler, burgee `run`. A
 * helper defined elsewhere and called from the handler is not followed.
 *
 * @see https://github.com/ofri-peretz/burgee/blob/main/.sdlc/intents/burgee/spec.md
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

import { fileUsesCliHost } from '../../utils/evidence';
import { enclosingHandler, lookup, programModel } from '../../utils/hosts';

type MessageIds = 'consoleInCommand';

export const noConsoleInCommand = createRule<[], MessageIds>({
  name: 'no-console-in-command',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-cli-floor/docs/rules/no-console-in-command.md',
      description:
        'Disallow `console.*` inside a CLI command handler; write through the output layer',
    },
    messages: {
      consoleInCommand: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'console Inside a Command Handler',
        description:
          'A command handler writes with console.*, bypassing the output layer that --json and non-TTY output depend on',
        severity: 'MEDIUM',
        fix: 'Return the result from the handler (burgee envelopes it for --json), or write through the one output module the program owns — not console.* from inside the command.',
        documentationLink:
          'https://github.com/ofri-peretz/burgee/blob/main/.sdlc/intents/burgee/spec.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    if (!fileUsesCliHost(context.sourceCode.ast)) return {};

    return {
      CallExpression(node): void {
        const { callee } = node;
        if (callee.type !== AST_NODE_TYPES.MemberExpression) return;
        const { object } = callee;
        if (object.type !== AST_NODE_TYPES.Identifier) return;
        if (object.name !== 'console') return;
        // A local binding named `console` is somebody's logger, not the global.
        const variable = lookup('console', context.sourceCode.getScope(node));
        if (variable && variable.defs.length > 0) return;

        const { handlers } = programModel(context.sourceCode);
        if (!enclosingHandler(node, handlers)) return;
        context.report({ node, messageId: 'consoleInCommand' });
      },
    };
  },
});
