// Model of eslint-plugin-import-next/no-named-as-default
// (import/no-named-as-default).
// A default import bound to the name of a NAMED export of the same module
// (`import foo from './m'` where './m' also exports `foo`) is reported: the
// reader cannot tell which `foo` they hold. The rule does not read the other
// module, so the evidence that './m' exports `foo` is this file's own use of
// that name from the same module: in the same declaration
// (`import foo, { foo as f2 }`), in another import (`import { foo as f2 }
// from './m'`) or a re-export (`export { foo } from './m'`).
// The default can be spelled `import foo` or `import { default as foo }`.
// Silent: the name from another module, a default bound to another name,
// no evidence at all, and evidence that is only a TYPE (`{ type foo as F }`):
// a type and a default value sharing a name is a judgment call.
module no_named_as_default {
  type Dflt = DefaultImport | DefaultSpecifier
  type Evidence = SameDecl | OtherDecl | Reexport | TypeEvidence | OtherModule | NameDiffers | NoEvidence

  pure def reports(d: Dflt, e: Evidence): bool =
    Set(SameDecl, OtherDecl, Reexport).contains(e)

  var dflt: Dflt
  var evidence: Evidence
  var verdict: bool

  action step = {
    nondet d = Set(DefaultImport, DefaultSpecifier).oneOf()
    nondet e = Set(SameDecl, OtherDecl, Reexport, TypeEvidence, OtherModule, NameDiffers, NoEvidence).oneOf()
    all { dflt' = d, evidence' = e, verdict' = reports(d, e) }
  }

  action init = step
}
