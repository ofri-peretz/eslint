const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const SELF = { SelfAgents: 'AGENTS.md', SelfGemini: 'GEMINI.md' };
const OTHER = {
  OtherAgents: 'AGENTS.md',
  OtherClaudeLocal: 'CLAUDE.local.md',
  OtherReadme: 'README.md',
};
const DIR = { Same: 'pkg/', Parent: '', Child: 'pkg/sub/' };

const LONG = 'Reproduce visual bugs at ~390px before claiming any fix.';
const SHORT = 'Run the linter before pushing.';

/** The other file's copy of this file's line. */
const COPY = {
  Exact: [`- ${LONG}`],
  Reformatted: [
    '- **REPRODUCE visual bugs** at ~390px   before claiming any fix.',
  ],
  ShortLine: [`- ${SHORT}`],
  InFence: ['```text', LONG, '```'],
  Different: ['- Keep every generated file out of review diffs.'],
};

/** Self AGENTS.md beside other AGENTS.md is one file: put that one at the root instead. */
const otherPath = (s) => {
  const o = OTHER[tag(s.other)];
  const self = SELF[tag(s.self)];
  const dir = DIR[tag(s.place)];
  return `${dir}${o}` === `pkg/${self}` ? null : `${dir}${o}`;
};

module.exports = {
  rule: 'no-duplicated-guidance',
  markdown: true,
  domain: 2 * 3 * 3 * 5 * 2,
  traces: 1300,
  key: keyOf('self', 'other', 'place', 'copy', 'minLength'),
  filename: (s) => `pkg/${SELF[tag(s.self)]}`,
  config: (s) =>
    tag(s.minLength) === 'LowMin' ? { minLength: 10 } : undefined,
  code: (s) => {
    const line = tag(s.copy) === 'ShortLine' ? SHORT : LONG;
    return src('# Guide', '', `- ${line}`);
  },
  files: (s) => {
    const other = otherPath(s);
    return other ? { [other]: src('# Shared', '', ...COPY[tag(s.copy)]) } : {};
  },
};
