import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { Rule } from 'eslint';

import { subagentDeclaresModel } from '../../rules/guidance/subagent-declares-model';
import { markdownRuleTester } from './markdown-tester';

const rule = subagentDeclaresModel as unknown as Rule.RuleModule;

// A Claude Code plugin ships its subagents from <root>/agents/, beside
// <root>/.claude-plugin/plugin.json; an agents/ folder without one is not a plugin.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'subagent-declares-model-'));
const pluginRoot = path.join(tmp, 'plugin');
fs.mkdirSync(path.join(pluginRoot, '.claude-plugin'), { recursive: true });
fs.writeFileSync(
  path.join(pluginRoot, '.claude-plugin', 'plugin.json'),
  '{"name":"p"}',
);
const pluginAgent = path.join(pluginRoot, 'agents', 'reviewer.md');
const plainAgentsFolder = path.join(tmp, 'notes', 'agents', 'reviewer.md');

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
      name: 'an agents/ folder with no plugin manifest beside it is not a subagent',
      filename: plainAgentsFolder,
      code: 'No frontmatter.\n',
    },
    {
      name: "a plugin's subagent that declares both",
      filename: pluginAgent,
      code: '---\nmodel: haiku\ntools: Read\n---\n',
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
      name: "a plugin's subagent (agents/ beside .claude-plugin/plugin.json) without a model",
      filename: pluginAgent,
      code: '---\ntools: Read\n---\n',
      errors: [{ messageId: 'missingKey', line: 1 }],
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
