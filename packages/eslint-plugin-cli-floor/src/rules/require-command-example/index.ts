/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Every runnable command declares an example, and every example
 * is one copy-pasteable line
 * @description burgee requirements F3 and H2. An example is the one part of
 * help an agent can act on without reading prose — if it exists and if it is a
 * single line it can run. Reads burgee's `examples` array, yargs' `.example()`
 * (inside the command's builder, or on the root for the default command) and
 * commander's `.addHelpText()`, commander's only place for one.
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

type MessageIds = 'missingExample' | 'multilineExample';

export const requireCommandExample = createRule<[], MessageIds>({
  name: 'require-command-example',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-cli-floor/docs/rules/require-command-example.md',
      description:
        'Require every runnable CLI command to declare an example, and every example to be a single line',
    },
    messages: {
      missingExample: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Command Without an Example',
        description:
          'This command runs but declares no example, so a caller learns its invocation by trial and error',
        severity: 'MEDIUM',
        fix: 'Add one runnable line: burgee `examples: [{ command: "mytool build --out dist" }]`, yargs `.command("build", "…", (y) => y.example("$0 build --out dist", "…"), handler)`, commander `.addHelpText("after", "\\nExample:\\n  $ mytool build --out dist")`.',
        documentationLink:
          'https://github.com/ofri-peretz/burgee/blob/main/.sdlc/intents/burgee/spec.md',
      }),
      multilineExample: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Multi-line Example',
        description:
          'This example command spans more than one line, so it cannot be copied and run as written',
        severity: 'MEDIUM',
        fix: 'Make the example one command line; move the explanation into the example description.',
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
        const model = programModel(context.sourceCode);
        for (const command of model.commands) {
          // A group dispatches to its children; the example belongs on them.
          if (!command.runnable || command.hidden) continue;
          if (command.examples !== 'absent') continue;
          context.report({ node: command.node, messageId: 'missingExample' });
        }
        for (const line of model.multilineExamples) {
          context.report({ node: line, messageId: 'multilineExample' });
        }
      },
    };
  },
});
