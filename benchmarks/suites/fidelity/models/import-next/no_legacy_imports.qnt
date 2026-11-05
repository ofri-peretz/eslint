// Model of eslint-plugin-import-next/no-legacy-imports.
// The user maps deprecated import paths to their replacements (`mappings`;
// `deprecated` is a regular expression tested against the specifier). The
// rule reports every way a module is loaded or re-exported whose specifier
// matches a mapping - a type-only import too: the deprecated path is going
// away, and its types with it. `mappings: []` reports nothing. `severity` is
// informational: the ESLint severity in the config decides warn vs error.
//
// Not a finding: a specifier the expression does not match (`@new/lib`, and
// `./vendor/@old/lib` under the anchored `^@old/lib`).
module no_legacy_imports {
  type Form = Default | Namespace | Named | Renamed | TypeOnly | InlineType | SideEffect
    | ExportNamed | ExportAll | ExportAllAs | Require | Dynamic | ImportEquals
  type Spec = Exact | Subpath | Replacement | Embedded
  // mappings [{ deprecated: '^@old/lib', replacement: '@new/lib' }], with
  // severity 'warn' (default) or 'error'; or no mappings.
  type Config = Mapped | MappedError | Empty

  pure def reports(f: Form, s: Spec, c: Config): bool =
    c != Empty and Set(Exact, Subpath).contains(s)

  var form: Form
  var spec: Spec
  var config: Config
  var verdict: bool

  action step = {
    nondet f = Set(Default, Namespace, Named, Renamed, TypeOnly, InlineType, SideEffect,
      ExportNamed, ExportAll, ExportAllAs, Require, Dynamic, ImportEquals).oneOf()
    nondet s = Set(Exact, Subpath, Replacement, Embedded).oneOf()
    nondet c = Set(Mapped, MappedError, Empty).oneOf()
    all { form' = f, spec' = s, config' = c, verdict' = reports(f, s, c) }
  }

  action init = step
}
