// Model of eslint-plugin-import-next/no-empty-named-blocks.
// An empty named block imports or re-exports nothing: `import {} from 'm'`,
// `import a, {} from 'm'`, `import type {} from 'm'`, `export {} from 'm'`.
// A comment inside the braces leaves them empty. Braces the statement does
// not have (a `{}` inside a comment) are no block. A local `export {}` marks
// a file as a module and is not a finding; a side-effect `import 'm'` has no
// block.
module no_empty_named_blocks {
  type Stmt =
    ImpEmpty | ImpEmptyComment | ImpDefaultEmpty | ImpDefaultEmptyComment | ImpTypeEmpty
    | ImpNamed | ImpDefaultNamed | ImpDefault | ImpDefaultBraceComment | ImpSideEffect
    | ExpEmptyFrom | ExpTypeEmptyFrom | ExpEmptyLocal | ExpNamedFrom

  pure def reports(s: Stmt): bool =
    Set(ImpEmpty, ImpEmptyComment, ImpDefaultEmpty, ImpDefaultEmptyComment, ImpTypeEmpty,
        ExpEmptyFrom, ExpTypeEmptyFrom).contains(s)

  var stmt: Stmt
  var verdict: bool

  action step = {
    nondet s = Set(ImpEmpty, ImpEmptyComment, ImpDefaultEmpty, ImpDefaultEmptyComment, ImpTypeEmpty,
      ImpNamed, ImpDefaultNamed, ImpDefault, ImpDefaultBraceComment, ImpSideEffect,
      ExpEmptyFrom, ExpTypeEmptyFrom, ExpEmptyLocal, ExpNamedFrom).oneOf()
    all { stmt' = s, verdict' = reports(s) }
  }

  action init = step
}
