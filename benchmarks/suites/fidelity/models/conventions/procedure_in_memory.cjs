const { num, tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const FILE = {
  Memory: 'AGENTS.md',
  Skill: '.claude/skills/release/SKILL.md',
  Agent: '.claude/agents/releaser.md',
};
const MAX = { DefaultMax: undefined, Three: 3, Seven: 7 };

function list(n, layout) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    out.push(`${i}. Run release step ${i}.`);
    if (layout === 'Spaced' && i < n) out.push('');
    if (layout === 'Continued') out.push('   It prints what it changed.');
    if (layout === 'Broken' && i === Math.ceil(n / 2))
      out.push('Then check the output before you go on.');
  }
  return layout === 'Fenced' ? ['```text', ...out, '```'] : out;
}

module.exports = {
  rule: 'procedure-in-memory',
  markdown: true,
  domain: 3 * 4 * 5 * 3,
  traces: 1300,
  key: keyOf('place', 'steps', 'layout', 'max'),
  filename: (s) => FILE[tag(s.place)],
  config: (s) => {
    const maxSteps = MAX[tag(s.max)];
    return maxSteps === undefined ? undefined : { maxSteps };
  },
  code: (s) => {
    // Skills and subagents need their frontmatter to be what they are.
    const head =
      tag(s.place) === 'Memory'
        ? []
        : ['---', 'name: release', 'description: Cut a release.', '---', ''];
    return src(...head, '# Release', '', ...list(num(s.steps), tag(s.layout)));
  },
};
