// Model of eslint-plugin-import-next/newline-after-import.
// The last import of a block is followed by a blank line before the next
// statement. An import here is an import statement in any spelling: `import x
// from`, `import type`, and TS `import x = require(...)`. The finding is an
// import whose next statement is not an import and starts on the same line or
// the very next line. Another import right after, or the end of the file, is
// fine.
// left out (judgment): a comment line between the import and the code
// (upstream counts it as the separating line); top-level `require()` calls
// (not an import statement).
module newline_after_import {
  type Imp = Import | TypeImport | ImportEquals
  type Sep = SameLine | NextLine | BlankLine
  type Next = NextImport | NextImportEquals | NextStmt | NextExportFrom | Eof

  pure def reports(n: Next, s: Sep): bool =
    Set(NextStmt, NextExportFrom).contains(n) and s != BlankLine

  var imp: Imp
  var sep: Sep
  var follow: Next
  var verdict: bool

  action step = {
    nondet i = Set(Import, TypeImport, ImportEquals).oneOf()
    nondet s = Set(SameLine, NextLine, BlankLine).oneOf()
    nondet n = Set(NextImport, NextImportEquals, NextStmt, NextExportFrom, Eof).oneOf()
    all { imp' = i, sep' = s, follow' = n, verdict' = reports(n, s) }
  }

  action init = step
}
