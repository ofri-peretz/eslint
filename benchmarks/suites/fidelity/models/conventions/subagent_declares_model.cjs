const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const FILE = {
  Agent: '.claude/agents/reviewer.md',
  NestedAgent: '.claude/agents/shared/reviewer.md',
  Memory: 'CLAUDE.md',
  Doc: 'docs/reviewer.md',
};

const line = (key, k, value) =>
  ({ Declared: [`${key}: ${value}`], Empty: [`${key}:`], Absent: [] })[tag(k)];

module.exports = {
  rule: 'subagent-declares-model',
  markdown: true,
  domain: 4 * 3 * 3 * 2,
  traces: 500,
  key: keyOf('place', 'model', 'tools', 'front'),
  filename: (s) => FILE[tag(s.place)],
  code: (s) => {
    const keys = [
      'name: reviewer',
      'description: Reviews a diff for correctness.',
      ...line('model', s.model, 'haiku'),
      ...line('tools', s.tools, 'Read, Grep, Glob'),
    ];
    // Without frontmatter the same lines are body text and declare nothing.
    const head = tag(s.front) === 'HasFront' ? ['---', ...keys, '---'] : keys;
    return src(...head, '', 'Review the diff you are given and report bugs.');
  },
};
