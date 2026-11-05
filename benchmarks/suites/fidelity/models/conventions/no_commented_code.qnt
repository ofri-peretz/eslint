// Model of eslint-plugin-conventions/no-commented-code (SonarQube RSPEC-125).
// Commented-out code rots: version control keeps history, a comment does not
// compile. The rule reports a comment whose lines are code copied from source
// - a declaration, a call statement, an import - in a `//` line, a run of
// `//` lines, or a `/* */` block. It does not report:
//   - prose, even prose that opens with a keyword (`for widget compatibility`)
//     or ends in a parenthetical, and a bare link;
//   - a JSDoc block (`/** */`): an `@example` body is the one place a comment
//     is meant to hold code;
// Options, each sampled flipped:
//   - ignoreSingleLine (default false): a lone `//` line is not reported;
//   - minLines (default 1; sampled at 2): a comment shorter than that is not;
//   - ignoreInTests (default true): nothing is reported in a `.test.ts` /
//     `.spec.ts` file unless it is set to false.
module no_commented_code {
  type Shape = Statement | Call | Import | ProseKeyword | ProseParen | Link | JsdocExample
  type Form = LineSingle | LineRun | Block | BlockMulti
  type Opt = Default | SingleFlip | MinLinesFlip | TestDefault | TestFlip

  pure def isCode(s: Shape): bool = Set(Statement, Call, Import).contains(s)
  pure def lineCount(f: Form): int = if (Set(LineSingle, Block).contains(f)) 1 else 2

  pure def reports(s: Shape, f: Form, o: Opt): bool =
    isCode(s)
    and o != TestDefault
    and not(o == SingleFlip and f == LineSingle)
    and not(o == MinLinesFlip and lineCount(f) < 2)

  var shape: Shape
  var form: Form
  var opt: Opt
  var verdict: bool

  action step = {
    nondet s = Set(Statement, Call, Import, ProseKeyword, ProseParen, Link, JsdocExample).oneOf()
    nondet f = Set(LineSingle, LineRun, Block, BlockMulti).oneOf()
    nondet o = Set(Default, SingleFlip, MinLinesFlip, TestDefault, TestFlip).oneOf()
    all { shape' = s, form' = f, opt' = o, verdict' = reports(s, f, o) }
  }

  action init = step
}
