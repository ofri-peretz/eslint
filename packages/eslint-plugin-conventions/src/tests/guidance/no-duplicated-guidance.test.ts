import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { Rule } from 'eslint';
import { afterAll, describe, expect, it } from 'vitest';

import {
  noDuplicatedGuidance,
  normalizeGuidance,
} from '../../rules/guidance/no-duplicated-guidance';
import { markdownRuleTester } from './markdown-tester';

const rule = noDuplicatedGuidance as unknown as Rule.RuleModule;

const RULE_LINE =
  'Never merge on red or unknown; confirm every required check is SUCCESS.';

// The fixtures live under the working directory so the ancestor walk is real.
const tmp = fs.mkdtempSync(path.join(process.cwd(), '.tmp-guidance-'));
fs.mkdirSync(path.join(tmp, 'pkg'), { recursive: true });
fs.writeFileSync(
  path.join(tmp, 'AGENTS.md'),
  `# Rules\n\n- ${RULE_LINE}\n- short line\n`,
);
fs.writeFileSync(path.join(tmp, 'GEMINI.md'), `- **${RULE_LINE}**\n`);
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('normalizeGuidance', () => {
  it('drops list markers, emphasis, code ticks and case', () => {
    expect(normalizeGuidance('  1. **Never** `merge`   on  red')).toBe(
      'never merge on red',
    );
    expect(normalizeGuidance('- > # Heading')).toBe('heading');
  });
});

markdownRuleTester().run('no-duplicated-guidance', rule, {
  valid: [
    {
      name: 'the copy in the file that sorts first is not reported',
      filename: path.join(tmp, 'AGENTS.md'),
      code: `- ${RULE_LINE}\n`,
    },
    {
      name: 'a short line repeated is not a rule',
      filename: path.join(tmp, 'CLAUDE.md'),
      code: '- short line\n',
    },
    {
      name: 'not an always-loaded file',
      filename: path.join(tmp, 'README.md'),
      code: `${RULE_LINE}\n`,
    },
    {
      name: 'no companions on disk',
      filename: path.join(os.tmpdir(), 'lonely', 'CLAUDE.md'),
      code: `${RULE_LINE}\n`,
    },
  ],
  invalid: [
    {
      name: 'a copy of an ancestor line is reported even when the ancestor path sorts later',
      filename: path.join(tmp, '.github', 'AGENTS.md'),
      code: `- ${RULE_LINE}\n`,
      errors: [{ messageId: 'duplicated' }],
    },
    {
      name: 'a GEMINI.md copy of a CLAUDE.md line is reported in GEMINI.md, which sorts later',
      filename: path.join(tmp, 'pkg', 'GEMINI.md'),
      code: `Some intro.\n\n- ${RULE_LINE}\n`,
      errors: [{ messageId: 'duplicated', line: 3 }],
    },
    {
      name: 'CLAUDE.md repeats a line from AGENTS.md beside it',
      filename: path.join(tmp, 'CLAUDE.md'),
      code: `# Workflow\n\n1. ${RULE_LINE}\n`,
      errors: [
        {
          messageId: 'duplicated',
          line: 3,
          data: {
            other: path.relative(process.cwd(), path.join(tmp, 'AGENTS.md')),
            otherLine: '3',
          },
        },
      ],
    },
    {
      name: 'a nested CLAUDE.md repeats a line from an ancestor',
      filename: path.join(tmp, 'pkg', 'CLAUDE.md'),
      code: `${RULE_LINE}\n`,
      errors: [{ messageId: 'duplicated' }],
    },
  ],
});
