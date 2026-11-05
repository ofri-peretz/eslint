// Model of eslint-plugin-import-next/unambiguous.
// A module must be recognisable as a module from its syntax alone (the
// Unambiguous JavaScript Grammar): a file with no import or export
// declaration parses as a script too. Module syntax here: an `import`
// declaration (also type-only and side-effect), any `export` (also `export
// {}` and TS `export =`), TS `import x = require()` (TS treats the file as a
// module), and `import.meta` (a syntax error in a script). A dynamic
// `import()` is legal in a script, so it does not disambiguate. A file
// beginning with 'use strict' is exempt by the rule's design (the author
// stated a parse mode). A file the config declares CommonJS (`.cjs`) is a
// script on purpose: silent.
module unambiguous {
  type Content = Statements | Empty | UseStrict | ImportDecl | TypeImport | SideEffectImport
    | ExportNamed | ExportEmpty | ExportDefault | ExportAll | ExportAssign | ImportEquals
    | DynamicImportOnly | ImportMetaOnly | CommonJs
  type File = Ts | Cjs

  var content: Content
  var file: File
  var verdict: bool

  action step = {
    nondet c = Set(Statements, Empty, UseStrict, ImportDecl, TypeImport, SideEffectImport,
      ExportNamed, ExportEmpty, ExportDefault, ExportAll, ExportAssign, ImportEquals,
      DynamicImportOnly, ImportMetaOnly, CommonJs).oneOf()
    nondet f = Set(Ts, Cjs).oneOf()
    all { content' = c, file' = f,
          verdict' = (f == Ts and Set(Statements, DynamicImportOnly, CommonJs).contains(c)) }
  }

  action init = step
}
