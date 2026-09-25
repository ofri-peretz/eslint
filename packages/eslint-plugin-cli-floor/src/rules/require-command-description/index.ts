/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Every command declares a description
 * @description burgee requirement F3, first half. A command with no description
 * is a bare word in `--help`, in `--schema` and in an MCP tool list: a human
 * guesses, and an agent has to run it to find out what it does. The rule reads
 * commander's `.description()` / `.summary()`, yargs' second `.command()`
 * argument or `describe` key, and burgee's `description` field — only on a
 * command whose host is proven by import.
 *
 * @see https://github.com/ofri-peretz/burgee/blob/main/.sdlc/intents/burgee/spec.md
 */

import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

import { fileUsesCliHost } from '../../utils/evidence';
import { programModel } from '../../utils/hosts';

type MessageIds = 'missingDescription';

export const requireCommandDescription = createRule<[], MessageIds>({
  name: 'require-command-description',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-cli-floor/docs/rules/require-command-description.md',
      description: 'Require every CLI command to declare a description',
    },
    messages: {
      missingDescription: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Command Without a Description',
        description:
          'This command declares no description, so --help, --schema and an agent reading the command tree see only its name',
        severity: 'MEDIUM',
        fix: 'Describe what the command does in one sentence: commander `.description("Build the site")`, yargs `.command("build", "Build the site", …)`, burgee `defineCommand({ name: "build", description: "Build the site", … })`.',
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
      'Program:exit'(): void {
        for (const command of programModel(context.sourceCode).commands) {
          // A hidden command is not in help; what it would say there is moot.
          if (command.hidden) continue;
          if (command.description !== 'absent') continue;
          context.report({
            node: command.node,
            messageId: 'missingDescription',
          });
        }
      },
    };
  },
});
