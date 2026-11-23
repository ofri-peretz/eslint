// Model of eslint-plugin-conventions/procedure-in-memory.
// An always-loaded file (CLAUDE.md, AGENTS.md, GEMINI.md) is read on every
// session, so a numbered procedure longer than `maxSteps` (default 5) there
// belongs in a skill. A procedure is a run of top-level numbered items;
// blank lines and indented continuation lines between items do not end it,
// a paragraph does. A list inside fenced code is an example, not guidance.
// A skill or a subagent file is where a procedure belongs: never reported.
module procedure_in_memory {
  type Place = Memory | Skill | Agent
  type Layout = Tight | Spaced | Continued | Fenced | Broken
  type Max = DefaultMax | Three | Seven

  pure def limit(m: Max): int = if (m == Three) 3 else if (m == Seven) 7 else 5

  // The longest run of the list as written. `Broken` puts a paragraph after
  // the first ceil(n/2) items.
  pure def longest(n: int, l: Layout): int =
    if (l == Fenced) 0 else if (l == Broken) (n + 1) / 2 else n

  pure def reports(p: Place, n: int, l: Layout, m: Max): bool =
    p == Memory and longest(n, l) > limit(m)

  var place: Place
  var steps: int
  var layout: Layout
  var max: Max
  var verdict: bool

  action step = {
    nondet p = Set(Memory, Skill, Agent).oneOf()
    nondet n = Set(3, 5, 6, 8).oneOf()
    nondet l = Set(Tight, Spaced, Continued, Fenced, Broken).oneOf()
    nondet m = Set(DefaultMax, Three, Seven).oneOf()
    all { place' = p, steps' = n, layout' = l, max' = m, verdict' = reports(p, n, l, m) }
  }

  action init = step
}
