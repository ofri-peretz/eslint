// Model of eslint-plugin-import-next/extensions: a user-configured
// convention for writing file extensions on relative specifiers.
//
// The policy for an extension is, most specific first: the user's
// `pattern[ext]`, the user's `default`, the rule's own pattern (js/ts/jsx/tsx
// `never`; json/css/scss/svg/png/jpg `always`), then `never`.
//
//   - A WRITTEN extension under `never` is reported when it is not
//     load-bearing: removing it resolves to the same file. `./dep.js` that
//     resolves to dep.ts (the NodeNext output-extension spelling) is
//     load-bearing and never reported. A written extension on a specifier
//     that does not resolve (`./missing.js`) proves nothing: not reported.
//   - A MISSING extension is reported when the RESOLVED file's extension is
//     `always`. A specifier that does not resolve (`./missing`) or resolves to
//     a directory index (`./lib`) proves nothing and is not reported. A dot in
//     a file name (`./source.config` -> source.config.ts) is not an extension.
//
// Package specifiers are never checked. Every spelling: import, side-effect,
// export-from, export *, import(), require(), import = require().
// Left out (judgment): `import type`, which some setups exempt.
module extensions {
  type Form = Import | SideEffect | ExportNamed | ExportAll | Dynamic | Require | ImportEquals
  type Spec = NoExt | TsExt | JsMapped | RealJs | RealJsNoExt | Dir | Json | Missing | MissingJs | DottedName | Package
  type Opts = Default | AlwaysAll | TsAlways | AlwaysButTs | NeverAll
  type Ext = Ts | Js | Json_ | NoneExt
  type Policy = Always | Never

  pure def policy(o: Opts, e: Ext): Policy =
    if (o == AlwaysAll) Always
    else if (o == NeverAll) Never
    else if (o == TsAlways) (if (e == Ts or e == Json_) Always else Never)
    else if (o == AlwaysButTs) (if (e == Ts) Never else Always)
    else (if (e == Json_) Always else Never) // Default

  // The extension written on the specifier (none for a dotted file name).
  pure def written(p: Spec): Ext =
    if (p == TsExt) Ts
    else if (p == JsMapped or p == RealJs or p == MissingJs) Js
    else if (p == Json) Json_
    else NoneExt

  // The extension of the file a specifier without one resolves to.
  pure def resolvedExt(p: Spec): Ext =
    if (p == NoExt or p == DottedName) Ts
    else if (p == RealJsNoExt) Js
    else NoneExt // Dir (index), Missing, Package: nothing to judge

  pure def reports(p: Spec, o: Opts): bool =
    if (written(p) != NoneExt)
      p != JsMapped and p != MissingJs and policy(o, written(p)) == Never
    else
      resolvedExt(p) != NoneExt and policy(o, resolvedExt(p)) == Always

  var form: Form
  var spec: Spec
  var opts: Opts
  var verdict: bool

  action step = {
    nondet f = Set(Import, SideEffect, ExportNamed, ExportAll, Dynamic, Require, ImportEquals).oneOf()
    nondet p = Set(NoExt, TsExt, JsMapped, RealJs, RealJsNoExt, Dir, Json, Missing, MissingJs, DottedName, Package).oneOf()
    nondet o = Set(Default, AlwaysAll, TsAlways, AlwaysButTs, NeverAll).oneOf()
    all { form' = f, spec' = p, opts' = o, verdict' = reports(p, o) }
  }

  action init = step
}
