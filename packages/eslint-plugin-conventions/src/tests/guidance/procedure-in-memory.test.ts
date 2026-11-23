import type { Rule } from 'eslint';

import { procedureInMemory } from '../../rules/guidance/procedure-in-memory';
import { markdownRuleTester } from './markdown-tester';

const rule = procedureInMemory as unknown as Rule.RuleModule;

const steps = (n: number): string =>
  Array.from({ length: n }, (_, i) => `${i + 1}. Step ${i + 1}`).join('\n');

markdownRuleTester().run('procedure-in-memory', rule, {
  valid: [
    { name: 'five steps is the limit', filename: 'CLAUDE.md', code: steps(5) },
    {
      name: 'a skill may hold a procedure',
      filename: '.claude/skills/x/SKILL.md',
      code: steps(12),
    },
    {
      name: 'two short lists separated by prose',
      filename: 'AGENTS.md',
      code: `${steps(4)}\n\nThen:\n\n${steps(4)}\n`,
    },
    {
      name: 'nested numbered items are not top-level steps',
      filename: 'CLAUDE.md',
      code: `1. Release\n${steps(5)
        .split('\n')
        .map((l) => `   ${l}`)
        .join('\n')}\n2. Announce\n`,
    },
    {
      name: 'a fence at the margin ends a list',
      filename: 'AGENTS.md',
      code: `${steps(3)}\n\n\`\`\`sh\nnpm test\n\`\`\`\n\n${steps(3)}\n`,
    },
    {
      name: 'a numbered list inside a code fence',
      filename: 'CLAUDE.md',
      code: '```\n' + steps(9) + '\n```\n',
    },
  ],
  invalid: [
    {
      name: 'a long list in GEMINI.md after a short one',
      filename: 'GEMINI.md',
      code: `${steps(2)}\n\nRelease:\n\n${steps(7)}\n`,
      errors: [
        {
          messageId: 'procedureInMemory',
          line: 6,
          data: { steps: '7', maxSteps: '5' },
        },
      ],
    },
    {
      name: 'six steps in CLAUDE.md',
      filename: 'CLAUDE.md',
      code: `# Release\n\n${steps(6)}\n`,
      errors: [
        {
          messageId: 'procedureInMemory',
          line: 3,
          data: { steps: '6', maxSteps: '5' },
        },
      ],
    },
    {
      name: 'a fence indented under a step continues the list',
      filename: 'AGENTS.md',
      code: '1. a\n   ```sh\n   npm test\n   ```\n2. b\n3. c\n',
      options: [{ maxSteps: 2 }],
      errors: [
        { messageId: 'procedureInMemory', data: { steps: '3', maxSteps: '2' } },
      ],
    },
    {
      name: 'blank lines and continuation lines do not end the list',
      filename: 'AGENTS.md',
      code: '1. a\n\n   more about a\n2. b\n3) c\n',
      options: [{ maxSteps: 2 }],
      errors: [
        {
          messageId: 'procedureInMemory',
          line: 1,
          data: { steps: '3', maxSteps: '2' },
        },
      ],
    },
  ],
});
