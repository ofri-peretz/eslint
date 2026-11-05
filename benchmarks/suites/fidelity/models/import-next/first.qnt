// Model of eslint-plugin-import-next/first.
// Every import comes before any other statement. A file is two leading
// statements and a final import; an import (`import ... from`, or TS
// `import x = require(...)`) is reported when ANY non-import statement comes
// before it, not only the one right above it. Directive prologue strings
// ('use client', or any string directive) at the very top are not statements
// of the module body and may precede the imports; a string after an import is
// not a directive any more, it is an expression statement.
module first {
  type Slot = None | UseClient | OtherDirective | Stmt | Import | ImportEquals
  type Last = LastImport | LastImportEquals

  pure def isImport(s: Slot): bool = Set(Import, ImportEquals).contains(s)
  pure def isDirective(s: Slot): bool = Set(UseClient, OtherDirective).contains(s)

  // Is s2 a non-import statement (given s1 before it)?
  pure def blocks1(s1: Slot): bool = s1 == Stmt
  pure def blocks2(s1: Slot, s2: Slot): bool =
    s2 == Stmt or (isDirective(s2) and (s1 == Stmt or isImport(s1)))

  pure def reports(s1: Slot, s2: Slot): bool =
    // s2 an import after a blocking s1, or the last import after either.
    (isImport(s2) and blocks1(s1)) or blocks1(s1) or blocks2(s1, s2)

  var s1: Slot
  var s2: Slot
  var last: Last
  var verdict: bool

  action step = {
    nondet a = Set(None, UseClient, OtherDirective, Stmt, Import, ImportEquals).oneOf()
    nondet b = Set(None, UseClient, OtherDirective, Stmt, Import, ImportEquals).oneOf()
    nondet l = Set(LastImport, LastImportEquals).oneOf()
    all { s1' = a, s2' = b, last' = l, verdict' = reports(a, b) }
  }

  action init = step
}
