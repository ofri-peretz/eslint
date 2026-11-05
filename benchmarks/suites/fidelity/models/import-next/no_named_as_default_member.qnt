// Model of eslint-plugin-import-next/no-named-as-default-member
// (import/no-named-as-default-member).
// Reading a NAMED export of a module as a property of its DEFAULT import
// (`foo.bar` where `foo` is the default of './m' and './m' exports `bar`) is
// reported: `import { bar }` is what was meant. The rule does not read the
// other module, so the evidence that './m' exports `bar` is this file's own
// use of the name from the same module: in the default's own declaration, in
// another import (plain or renamed `{ bar as b2 }`) or a re-export.
// The default can be spelled `import foo` or `import { default as foo }`.
// The access is `foo.bar`, `foo['bar']` or `const { bar } = foo`.
// Silent: a runtime key `foo[k]`; a `foo` that is a different binding (a
// parameter shadowing the import); evidence from another module; no evidence.
module no_named_as_default_member {
  type Dflt = DefaultImport | DefaultSpecifier
  type Evidence = SameDecl | OtherDecl | Renamed | Reexport | OtherModule | NoEvidence
  type Access = Dot | Bracket | Dynamic | Destructure | Shadowed

  pure def reports(d: Dflt, e: Evidence, a: Access): bool =
    Set(SameDecl, OtherDecl, Renamed, Reexport).contains(e)
    and Set(Dot, Bracket, Destructure).contains(a)

  var dflt: Dflt
  var evidence: Evidence
  var access: Access
  var verdict: bool

  action step = {
    nondet d = Set(DefaultImport, DefaultSpecifier).oneOf()
    nondet e = Set(SameDecl, OtherDecl, Renamed, Reexport, OtherModule, NoEvidence).oneOf()
    nondet a = Set(Dot, Bracket, Dynamic, Destructure, Shadowed).oneOf()
    all { dflt' = d, evidence' = e, access' = a, verdict' = reports(d, e, a) }
  }

  action init = step
}
