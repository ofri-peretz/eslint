import type { Rule } from 'eslint';

import { subagentDeclaresModel } from '../../rules/guidance/subagent-declares-model';
import { markdownRuleTester } from './markdown-tester';

const rule = subagentDeclaresModel as unknown as Rule.RuleModule;

markdownRuleTester().run('subagent-declares-model', rule, {
  valid: [
    {
      name: 'model and tools declared',
      filename: '.claude/agents/reviewer.md',
      code: '---\nname: reviewer\nmodel: haiku\ntools: Read, Grep, Glob\n---\nReview.\n',
    },
    {
      name: 'tools as a YAML block list',
      filename: '.claude/agents/reviewer.md',
      code: '---\nmodel: haiku\ntools:\n  - Read\n  - Grep\n---\nReview.\n',
    },
    {
      name: 'tools as an unindented YAML block list',
      filename: '.claude/agents/reviewer.md',
      code: '---\nmodel: haiku\ntools:\n- Read\n---\nReview.\n',
    },
    {
      name: 'not a subagent',
      filename: 'docs/agents/reviewer.md',
      code: 'No frontmatter.\n',
    },
    {
      name: 'a nested file is not a subagent',
      filename: '.claude/agents/x/notes.md',
      code: 'x\n',
    },
  ],
  invalid: [
    {
      name: 'no frontmatter at all',
      filename: '.claude/agents/reviewer.md',
      code: 'Review the diff.\n',
      errors: [
        {
          messageId: 'missingKey',
          line: 1,
          data: {
            key: 'model',
            inherits: "the parent session's model",
            fix: 'Add `model: haiku` (or sonnet / opus) to the frontmatter: the cheapest model that does the narrow task well.',
          },
        },
        { messageId: 'missingKey', line: 1 },
      ],
    },
    {
      name: 'tools declared, model missing',
      filename: '.claude/agents/reviewer.md',
      code: '---\ntools: Read\n---\n',
      errors: [{ messageId: 'missingKey' }],
    },
    {
      name: 'an empty block list declares no tools',
      filename: '.claude/agents/reviewer.md',
      code: '---\nmodel: haiku\ntools:\n  # none yet\n---\n',
      errors: [{ messageId: 'missingKey' }],
    },
    {
      name: 'an empty model value, and an unterminated frontmatter is no frontmatter',
      filename: '.claude/agents/a.md',
      code: '---\nmodel:\ntools: Read\n',
      errors: [{ messageId: 'missingKey' }, { messageId: 'missingKey' }],
    },
  ],
});
