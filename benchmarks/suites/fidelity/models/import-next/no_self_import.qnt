// Model of eslint-plugin-import-next/no-self-import (import/no-self-import).
// A module that loads ITSELF is reported, in every way a module is loaded at
// runtime: `import`, side-effect `import`, `export ... from`, `export * from`,
// `require()`, `import()`, TS `import x = require()`.
// The specifier names this file when it resolves to it:
//   - './app', './app.js' (TS maps .js to the .ts source), './app.ts',
//     '../src/app' (any path back to the same file);
//   - for an index file, the directory itself: '.', './', '../lib'.
// It does not name this file: './app.tsx' (another file), './app.css' (a
// stylesheet), './other', a package 'app'.
// Not a self-import at runtime (silent): `import type` and an import whose
// every specifier is inline `type` (erased), and a call to a `require` the
// file declares itself (not Node's loader).
// `allowInTests` (default false) skips test files.
module no_self_import {
  type File = Plain | Index | TestFile
  type Spec = Bare | Js | Ts | Tsx | Dot | DotSlash | Parent | Css | Sibling | Package
  type Form = Import | TypeOnly | InlineTypeAll | SideEffect | Require | Dynamic
            | ExportFrom | ExportAll | ImportEquals | ShadowedRequire
  type Focus = Specs | Forms | Opts

  pure def self(f: File, s: Spec): bool =
    Set(Bare, Js, Ts, Parent).contains(s) or (f == Index and Set(Dot, DotSlash).contains(s))
  pure def loads(fm: Form): bool = not(Set(TypeOnly, InlineTypeAll, ShadowedRequire).contains(fm))
  pure def reports(f: File, s: Spec, fm: Form, allow: bool): bool =
    self(f, s) and loads(fm) and not(allow and f == TestFile)

  var focus: Focus
  var file: File
  var spec: Spec
  var form: Form
  var allowInTests: bool
  var verdict: bool

  action step = {
    nondet fo = Set(Specs, Forms, Opts).oneOf()
    nondet f = (if (fo == Specs) Set(Plain, Index, TestFile)
                else if (fo == Opts) Set(Plain, TestFile) else Set(Plain)).oneOf()
    nondet s = (if (fo == Specs) Set(Bare, Js, Ts, Tsx, Dot, DotSlash, Parent, Css, Sibling, Package)
                else if (fo == Forms) Set(Bare, Sibling) else Set(Bare)).oneOf()
    nondet fm = (if (fo == Forms) Set(Import, TypeOnly, InlineTypeAll, SideEffect, Require, Dynamic,
                                      ExportFrom, ExportAll, ImportEquals, ShadowedRequire)
                 else Set(Import)).oneOf()
    nondet a = (if (fo == Opts) Set(true, false) else Set(false)).oneOf()
    all { focus' = fo, file' = f, spec' = s, form' = fm, allowInTests' = a,
          verdict' = reports(f, s, fm, a) }
  }

  action init = step
}
