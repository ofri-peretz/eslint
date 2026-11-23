import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import markdown from '@eslint/markdown';
import { Linter, type Rule } from 'eslint';
import { describe, expect, it } from 'vitest';

import { guidanceBudget } from '../../rules/guidance/guidance-budget';
import { markdownRuleTester } from './markdown-tester';

const rule = guidanceBudget as unknown as Rule.RuleModule;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'guidance-budget-'));
const ratchetFile = path.join(tmp, 'ratchet.json');
fs.writeFileSync(
  ratchetFile,
  JSON.stringify({
    // grandfathered: its size the day the rule went on
    [path
      .relative(process.cwd(), path.join(tmp, 'big/CLAUDE.md'))
      .replace(/\\/g, '/')]: {
      bytes: 200,
      lines: 10,
    },
    // a ratchet entry below the default is just a tighter budget
    [path
      .relative(process.cwd(), path.join(tmp, 'tight/AGENTS.md'))
      .replace(/\\/g, '/')]: {
      bytes: 20,
    },
  }),
);

const lines = (n: number): string =>
  Array.from({ length: n }, (_, i) => `Line ${i}`).join('\n');

markdownRuleTester().run('guidance-budget', rule, {
  valid: [
    {
      name: 'a small CLAUDE.md',
      filename: 'CLAUDE.md',
      code: '# Commands\n\n- `npm test`\n',
    },
    {
      name: 'a README is not guidance',
      filename: 'README.md',
      code: lines(900),
    },
    {
      name: 'a skill under its body and description budgets',
      filename: '.claude/skills/ship/SKILL.md',
      code: '---\nname: ship\ndescription: Ship a PR.\n---\n\n# Ship\n',
    },
    {
      name: 'a skill with no description and no frontmatter',
      filename: '.claude/skills/ship/SKILL.md',
      code: lines(10),
    },
    {
      name: 'a ratcheted file at exactly its ratchet entry',
      filename: path.join(tmp, 'big/CLAUDE.md'),
      code: lines(10),
      options: [{ ratchetFile, memoryLines: 5 }],
    },
    {
      name: 'a missing ratchet file means defaults only',
      filename: 'AGENTS.md',
      code: lines(20),
      options: [{ ratchetFile: path.join(tmp, 'absent.json') }],
    },
  ],
  invalid: [
    {
      name: 'CLAUDE.md over the byte budget',
      filename: 'CLAUDE.md',
      code: 'x'.repeat(5000),
      errors: [
        {
          messageId: 'overBudget',
          line: 1,
          data: {
            kind: 'memory',
            measure: 'bytes',
            actual: '5000',
            budget: '4096',
            file: 'CLAUDE.md',
            ratchetFile: '.guidance-budget.json',
          },
        },
      ],
    },
    {
      name: 'AGENTS.md over the line budget',
      filename: 'pkg/AGENTS.md',
      code: lines(12),
      options: [{ memoryLines: 10 }],
      errors: [
        {
          messageId: 'overBudget',
          data: {
            kind: 'memory',
            measure: 'lines',
            actual: '12',
            budget: '10',
            file: 'pkg/AGENTS.md',
            ratchetFile: '.guidance-budget.json',
          },
        },
      ],
    },
    {
      name: 'a skill body over budget',
      filename: '.claude/skills/x/SKILL.md',
      code: `---\nname: x\n---\n${lines(8)}`,
      options: [{ skillLines: 5 }],
      errors: [
        {
          messageId: 'overBudget',
          data: {
            kind: 'skill',
            measure: 'lines',
            actual: '8',
            budget: '5',
            file: '.claude/skills/x/SKILL.md',
            ratchetFile: '.guidance-budget.json',
          },
        },
      ],
    },
    {
      name: 'a subagent body over the skill budget',
      filename: '.claude/agents/reviewer.md',
      code: lines(8),
      options: [{ skillLines: 5 }],
      errors: [{ messageId: 'overBudget' }],
    },
    {
      name: 'a skill description over budget, reported on its line',
      filename: '.claude/skills/x/SKILL.md',
      code: `---\nname: x\ndescription: ${'d'.repeat(30)}\n---\n`,
      options: [{ descriptionChars: 20 }],
      errors: [
        {
          messageId: 'overBudget',
          line: 3,
          data: {
            kind: 'skill',
            measure: 'descriptionChars',
            actual: '30',
            budget: '20',
            file: '.claude/skills/x/SKILL.md',
            ratchetFile: '.guidance-budget.json',
          },
        },
      ],
    },
    {
      name: 'a ratcheted file that grew past its entry',
      filename: path.join(tmp, 'big/CLAUDE.md'),
      code: lines(11),
      options: [{ ratchetFile, memoryLines: 5 }],
      errors: [{ messageId: 'overBudget' }],
    },
    {
      name: 'a ratcheted file that shrank asks for the entry to follow',
      filename: path.join(tmp, 'big/CLAUDE.md'),
      code: lines(8),
      options: [{ ratchetFile, memoryLines: 5 }],
      errors: [{ messageId: 'looseRatchet' }],
    },
    {
      name: 'a ratchet entry below the default tightens the budget',
      filename: path.join(tmp, 'tight/AGENTS.md'),
      code: 'x'.repeat(21),
      options: [{ ratchetFile }],
      errors: [{ messageId: 'overBudget' }],
    },
  ],
});

describe('guidance-budget: a malformed ratchet file', () => {
  it('names the file and the fix instead of throwing a bare SyntaxError', () => {
    const broken = path.join(tmp, 'broken.json');
    fs.writeFileSync(broken, '{ "CLAUDE.md": ');
    const linter = new Linter();
    expect(() =>
      linter.verify(
        '# x\n',
        {
          files: ['**/*.md'],
          plugins: { markdown, local: { rules: { 'guidance-budget': rule } } },
          language: 'markdown/gfm',
          rules: {
            'local/guidance-budget': ['error', { ratchetFile: broken }],
          },
        },
        'CLAUDE.md',
      ),
    ).toThrow(/broken\.json is not valid JSON .*fix: repair it/);
  });
});
