// Model of eslint-plugin-import-next/no-relative-packages.
// In a workspace, a relative specifier that climbs out of the importing
// file's package into ANOTHER package bypasses that package's name, its
// `exports` map and its build output: the import should use the package
// name. A package is a directory whose package.json has a `name`; a nameless
// package.json (a `{"type":"module"}` scope marker, a private tool folder) is
// not a package anyone can import by name, so it is neither a boundary nor a
// target. A package that contains the importing one (the workspace root,
// reached past a nameless folder) is not "another package" either.
//
// Layout: repo/packages/{app,other,tools}; app and other are named; tools has
// a nameless package.json; app/src/esm holds a `{"type":"module"}` marker.
// The linted file is repo/packages/app/src/app.ts, or app/src/esm/app.ts for
// FromMarker.
//
// Reported: OtherPkg (`../../other/src/x`) and OtherPkgRoot (`../../other`,
// the package root itself). Silent: SameDir, SameParent, IntoMarker /
// FromMarker (crossing a nameless marker stays in the package), OtherNameless.
//
// Every spelling: import, import type (the path still bypasses the package),
// side-effect, export-from, export *, import(), require(), import = require().
// `allowSamePackage` (default true) does not change any verdict: imports
// inside one package are never reported, whatever its value.
module no_relative_packages {
  type Form = Import | TypeOnly | SideEffect | ExportNamed | ExportAll | Dynamic | Require | ImportEquals
  type Target = SameDir | SameParent | OtherPkg | OtherPkgRoot | OtherNameless | IntoMarker | FromMarker
  type Opts = Default | SameTrue | SameFalse

  pure def reports(f: Form, t: Target, o: Opts): bool = Set(OtherPkg, OtherPkgRoot).contains(t)

  var form: Form
  var target: Target
  var opts: Opts
  var verdict: bool

  action step = {
    nondet f = Set(Import, TypeOnly, SideEffect, ExportNamed, ExportAll, Dynamic, Require, ImportEquals).oneOf()
    nondet t = Set(SameDir, SameParent, OtherPkg, OtherPkgRoot, OtherNameless, IntoMarker, FromMarker).oneOf()
    nondet o = Set(Default, SameTrue, SameFalse).oneOf()
    all { form' = f, target' = t, opts' = o, verdict' = reports(f, t, o) }
  }

  action init = step
}
