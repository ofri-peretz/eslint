/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Every prompt in a command is backed by a flag
 * @description burgee requirement P1. A prompt with no flag behind it is a
 * question only a person at a keyboard can answer: an agent, a CI job and a
 * pipe all hang or fail on it (clack #167, oclif/oclif #1492). The fix is
 * structural — read the value from the command line first, ask only when it
 * is missing — and so is the check.
 *
 * Reports a call into a prompt library (`@clack/prompts`, `inquirer`,
 * `@inquirer/*`, `prompts`, `enquirer`, `caique`), resolved by import, that sits
 * inside a proven command handler and is not guarded by a read of that
 * handler's inputs. See `utils/prompts.ts` for the guard shapes it accepts.
 *
 * Ships in `strict` only (burgee's intent: until a precision study on real CLIs
 * shows fewer than one false positive per hundred prompt calls).
 *
 * @see https://github.com/ofri-peretz/burgee/blob/main/.sdlc/intents/burgee/spec.md
 */

import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

import { fileUsesCliHost } from '../../utils/evidence';
import { enclosingHandler, programModel } from '../../utils/hosts';
import { isFlagBacked, isPromptCall } from '../../utils/prompts';

type MessageIds = 'promptWithoutFlag';

export const noPromptWithoutFlag = createRule<[], MessageIds>({
  name: 'no-prompt-without-flag',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-cli-floor/docs/rules/no-prompt-without-flag.md',
      description:
        'Require every interactive prompt in a CLI command to be skippable with a flag',
    },
    messages: {
      promptWithoutFlag: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Prompt Without a Flag',
        description:
          'This command prompts without first reading a flag for the answer, so a non-interactive caller cannot supply it and the run hangs or fails',
        severity: 'HIGH',
        fix: 'Declare an option for the answer and ask only when it is missing: `const name = options.name ?? await text({ message: "Name?" })`.',
        documentationLink:
          'https://github.com/ofri-peretz/burgee/blob/main/.sdlc/intents/burgee/spec.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    if (!fileUsesCliHost(context.sourceCode.ast)) return {};
    const { sourceCode } = context;

    return {
      CallExpression(node): void {
        if (!isPromptCall(node, sourceCode.getScope(node))) return;
        const model = programModel(sourceCode);
        const handler = enclosingHandler(node, model.handlers);
        if (!handler) return;
        const backed = isFlagBacked(node, {
          handler,
          optionReads: model.optionReads,
          scopeOf: (n) => sourceCode.getScope(n),
          visitorKeys: sourceCode.visitorKeys,
        });
        if (backed) return;
        context.report({ node, messageId: 'promptWithoutFlag' });
      },
    };
  },
});
