// Model of eslint-plugin-import-next/no-useless-path-segments.
// A relative specifier has a useless segment when a shorter relative
// specifier names the SAME module from the same file: `./lib/./dep`,
// `./lib/../dep`, `./lib//dep`, `./../src/dep` and `../src/dep` (from a file
// in src/) all name `./dep`. The linted file is src/app.ts.
//
// With `noUselessIndex`, an extensionless `/index` is useless too
// (`./lib/index` -> `./lib`, `./index` -> `.`), but only when the shorter
// specifier resolves to the same file: `./both/index` beside a `both.ts` is
// not useless, since `./both` names both.ts.
//
// Silent (judgment, so no finding):
//   - `./lib/index.js`: a written extension, required under NodeNext / ESM,
//     where a directory import does not load;
//   - a trailing slash `./lib/`, which only matches a directory and can name a
//     different module than `./lib`.
//
// Every static spelling is checked (`import`, `import type`, side-effect,
// `export ... from`, `export * from`, `import()`); `require()` and TS
// `import x = require()` follow the `commonjs` option (default true).
module no_useless_path_segments {
  type Form = Import | TypeOnly | SideEffect | ExportNamed | ExportAll | Dynamic | Require | ImportEquals
  type Spec = Clean | InnerDot | UpDown | DoubleSlash | DotUp | ParentReentry | ParentClean
            | Index | IndexExt | IndexShadowed | DirIndex | TrailingSlash
  type Opts = Default | UselessIndex | NoCommonjs

  pure def checked(f: Form, o: Opts): bool =
    not(o == NoCommonjs and Set(Require, ImportEquals).contains(f))

  pure def useless(p: Spec, o: Opts): bool =
    Set(InnerDot, UpDown, DoubleSlash, DotUp, ParentReentry).contains(p)
      or (o == UselessIndex and Set(Index, DirIndex).contains(p))

  pure def reports(f: Form, p: Spec, o: Opts): bool = checked(f, o) and useless(p, o)

  var form: Form
  var spec: Spec
  var opts: Opts
  var verdict: bool

  action step = {
    nondet f = Set(Import, TypeOnly, SideEffect, ExportNamed, ExportAll, Dynamic, Require, ImportEquals).oneOf()
    nondet p = Set(Clean, InnerDot, UpDown, DoubleSlash, DotUp, ParentReentry, ParentClean,
                   Index, IndexExt, IndexShadowed, DirIndex, TrailingSlash).oneOf()
    nondet o = Set(Default, UselessIndex, NoCommonjs).oneOf()
    all { form' = f, spec' = p, opts' = o, verdict' = reports(f, p, o) }
  }

  action init = step
}
