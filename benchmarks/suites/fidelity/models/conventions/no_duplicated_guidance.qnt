// Model of eslint-plugin-conventions/no-duplicated-guidance.
// Always-loaded files (AGENTS.md, CLAUDE.md, CLAUDE.local.md, GEMINI.md) in
// one directory and its ancestors are read in the same sessions, so a prose
// line written in two of them is paid for twice. Lines compare after the list
// marker, emphasis and whitespace are dropped and case is folded, and only
// when at least `minLength` (default 40) characters long. Each duplicate is
// reported once: in the file whose repo path sorts later.
// Not duplicates: a copy in a subdirectory's file (not loaded with this one),
// in a file that is not always loaded (README.md), or inside fenced code.
//
// The file linted is `pkg/<Self>`; the other file sits beside it (Same), in
// the repo root (Parent) or in `pkg/sub/` (Child). AGENTS.md beside AGENTS.md
// is the file itself: that input has no other file, and is silent.
module no_duplicated_guidance {
  type Self = SelfAgents | SelfGemini
  type Other = OtherAgents | OtherClaudeLocal | OtherReadme
  type Place = Same | Parent | Child
  type Copy = Exact | Reformatted | ShortLine | InFence | Different
  type MinLength = DefaultMin | LowMin

  // Does the other file's repo path sort before this one's?
  pure def otherFirst(s: Self, o: Other, p: Place): bool =
    if (p == Parent) true
    // pkg/AGENTS.md < pkg/CLAUDE.local.md < pkg/GEMINI.md
    else s == SelfGemini

  pure def duplicates(c: Copy, m: MinLength): bool =
    c == Exact or c == Reformatted or (c == ShortLine and m == LowMin)

  pure def reports(s: Self, o: Other, p: Place, c: Copy, m: MinLength): bool =
    o != OtherReadme and p != Child and otherFirst(s, o, p) and duplicates(c, m)

  var self: Self
  var other: Other
  var place: Place
  var copy: Copy
  var minLength: MinLength
  var verdict: bool

  action step = {
    nondet s = Set(SelfAgents, SelfGemini).oneOf()
    nondet o = Set(OtherAgents, OtherClaudeLocal, OtherReadme).oneOf()
    nondet p = Set(Same, Parent, Child).oneOf()
    nondet c = Set(Exact, Reformatted, ShortLine, InFence, Different).oneOf()
    nondet m = Set(DefaultMin, LowMin).oneOf()
    all { self' = s, other' = o, place' = p, copy' = c, minLength' = m, verdict' = reports(s, o, p, c, m) }
  }

  action init = step
}
