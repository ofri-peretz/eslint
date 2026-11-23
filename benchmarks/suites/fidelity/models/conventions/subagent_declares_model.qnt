// Model of eslint-plugin-conventions/subagent-declares-model.
// A subagent definition (`.claude/agents/<name>.md`, directly in that
// directory) must name its `model:` and its `tools:` in its frontmatter: one
// without a model inherits the parent's, one without tools inherits every
// tool. A key that is absent or empty is missing; a key written in the body,
// or in a file with no frontmatter, declares nothing. Any other Markdown file
// - a memory file, a nested `.claude/agents/<dir>/<name>.md`, a doc - is not
// a subagent and is never reported.
module subagent_declares_model {
  type Place = Agent | NestedAgent | Memory | Doc
  type Key = Declared | Empty | Absent
  type Front = HasFront | NoFront

  pure def declares(k: Key, f: Front): bool = f == HasFront and k == Declared

  pure def reports(p: Place, m: Key, t: Key, f: Front): bool =
    p == Agent and not(declares(m, f) and declares(t, f))

  var place: Place
  var model: Key
  var tools: Key
  var front: Front
  var verdict: bool

  action step = {
    nondet p = Set(Agent, NestedAgent, Memory, Doc).oneOf()
    nondet m = Set(Declared, Empty, Absent).oneOf()
    nondet t = Set(Declared, Empty, Absent).oneOf()
    nondet f = Set(HasFront, NoFront).oneOf()
    all { place' = p, model' = m, tools' = t, front' = f, verdict' = reports(p, m, t, f) }
  }

  action init = step
}
