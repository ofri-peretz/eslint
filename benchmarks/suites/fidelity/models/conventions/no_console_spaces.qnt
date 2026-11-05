// Model of eslint-plugin-conventions/no-console-spaces.
// The console joins its arguments with a space, so a space on the side of a
// string argument that touches another argument doubles it. The rule reports
// a leading space on an argument that has one before it, and a trailing space
// on an argument that has one after it - in a quoted string or a template.
// The console is Node's / the browser's global `console`, found by binding:
// dotted, string subscript, `globalThis.console`. It does not report:
//   - a leading space on the first argument or a trailing space on the last
//     (or only) one: nothing is joined there, the space is the message's own
//     (an indented line, a prompt);
//   - a `console` the code binds itself (an injected parameter) or a method
//     of another object - not the global console.
// The rule has no options.
module no_console_spaces {
  type Binding = Global | Subscript | GlobalThis | LocalShadow | OtherObject
  type Position = Only | First | Middle | Last
  type Space = Leading | Trailing | NoSpace
  type Spelling = Quoted | Template

  pure def isConsole(b: Binding): bool = Set(Global, Subscript, GlobalThis).contains(b)
  pure def redundant(p: Position, s: Space): bool =
    (s == Leading and Set(Middle, Last).contains(p)) or (s == Trailing and Set(First, Middle).contains(p))

  pure def reports(b: Binding, p: Position, s: Space): bool = isConsole(b) and redundant(p, s)

  var binding: Binding
  var position: Position
  var space: Space
  var spelling: Spelling
  var verdict: bool

  action step = {
    nondet b = Set(Global, Subscript, GlobalThis, LocalShadow, OtherObject).oneOf()
    nondet p = Set(Only, First, Middle, Last).oneOf()
    nondet s = Set(Leading, Trailing, NoSpace).oneOf()
    nondet sp = Set(Quoted, Template).oneOf()
    all { binding' = b, position' = p, space' = s, spelling' = sp,
          verdict' = reports(b, p, s) }
  }

  action init = step
}
