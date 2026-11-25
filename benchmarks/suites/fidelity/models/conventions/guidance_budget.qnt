// Model of eslint-plugin-conventions/guidance-budget.
// Budgets (set small here: 10 lines, 400 bytes, 20 description chars):
//   - a memory file (CLAUDE.md, AGENTS.md, GEMINI.md) has a line and a byte
//     budget for the whole file;
//   - a skill or subagent has a line budget for its body (after the
//     frontmatter) and a character budget for its `description:`; its bytes
//     are not budgeted.
// A file exactly at a budget is inside it.
// The per-repo ratchet file can hold a file's own budget. An entry is its
// budget: one written at the file's current size is silent; one set below
// the default holds the file to that; one above both the default and the
// file's size is reported as loose, so the space cannot be refilled.
// Any other Markdown file is never reported.
module guidance_budget {
  type Place = Memory | Skill | Agent | Doc
  type Size = Small | AtLimit | LongLines | ManyLines
  type Desc = ShortDesc | LongDesc | NoDesc
  type Entry = NoEntry | Exact | Loose | Lower

  pure def over(p: Place, s: Size, d: Desc): bool =
    if (p == Memory) s == LongLines or s == ManyLines
    else s == ManyLines or d == LongDesc

  pure def reports(p: Place, s: Size, d: Desc, e: Entry): bool =
    p != Doc and (
      if (e == NoEntry) over(p, s, d)
      else e == Loose or e == Lower
    )

  var place: Place
  var amount: Size
  var desc: Desc
  var entry: Entry
  var verdict: bool

  action step = {
    nondet p = Set(Memory, Skill, Agent, Doc).oneOf()
    nondet s = Set(Small, AtLimit, LongLines, ManyLines).oneOf()
    nondet d = Set(ShortDesc, LongDesc, NoDesc).oneOf()
    nondet e = Set(NoEntry, Exact, Loose, Lower).oneOf()
    all { place' = p, amount' = s, desc' = d, entry' = e, verdict' = reports(p, s, d, e) }
  }

  action init = step
}
