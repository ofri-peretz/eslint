const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');

const FILE = {
  Memory: 'CLAUDE.md',
  Skill: '.claude/skills/ship/SKILL.md',
  Agent: '.claude/agents/reviewer.md',
  Doc: 'docs/guide.md',
};
const BUDGET = { lines: 10, bytes: 400, descriptionChars: 20 };
const OPTIONS = {
  memoryLines: BUDGET.lines,
  memoryBytes: BUDGET.bytes,
  skillLines: BUDGET.lines,
  descriptionChars: BUDGET.descriptionChars,
};
const DESC = {
  ShortDesc: 'Ship a PR.',
  LongDesc: 'Ship a PR through every gate this repo runs.',
};

/** The measured part of the file, as lines (joined without a final newline). */
const BODY = {
  Small: () => ['# Guide', '', 'Run the tests.'],
  AtLimit: () =>
    Array.from({ length: BUDGET.lines }, (_, i) => `Line ${i + 1}.`),
  LongLines: () => [
    '# Guide',
    `${'Keep the gate green. '.repeat(15)}`,
    `${'Read the docs. '.repeat(15)}`,
  ],
  ManyLines: () =>
    Array.from({ length: BUDGET.lines + 2 }, (_, i) => `Line ${i + 1}.`),
};

function build(s) {
  const place = tag(s.place);
  const body = BODY[tag(s.amount)]();
  if (place === 'Memory' || place === 'Doc') return body.join('\n');
  const d = tag(s.desc);
  const front = [
    '---',
    'name: ship',
    ...(d === 'NoDesc' ? [] : [`description: ${DESC[d]}`]),
    '---',
  ];
  return [...front, ...body].join('\n');
}

/** What the rule measures for this file, so a ratchet entry can be set from it. */
function measure(s, text) {
  const lines = text.split('\n');
  if (tag(s.place) === 'Memory')
    return { bytes: Buffer.byteLength(text, 'utf8'), lines: lines.length };
  const d = tag(s.desc);
  const end = lines.indexOf('---', 1) + 1;
  return {
    lines: lines.length - end,
    ...(d === 'NoDesc' ? {} : { descriptionChars: DESC[d].length }),
  };
}

function entry(s, text) {
  const e = tag(s.entry);
  if (e === 'NoEntry') return undefined;
  const actual = measure(s, text);
  const out = {};
  for (const [m, n] of Object.entries(actual)) {
    out[m] = e === 'Exact' ? n : e === 'Loose' ? Math.max(n, BUDGET[m]) + 5 : 1;
  }
  return out;
}

module.exports = {
  rule: 'guidance-budget',
  markdown: true,
  domain: 4 * 4 * 3 * 4,
  traces: 1400,
  key: keyOf('place', 'amount', 'desc', 'entry'),
  filename: (s) => FILE[tag(s.place)],
  config: () => OPTIONS,
  code: build,
  files: (s) => {
    const e = entry(s, build(s));
    return {
      '.guidance-budget.json': JSON.stringify(
        e ? { [FILE[tag(s.place)]]: e } : {},
      ),
    };
  },
};
