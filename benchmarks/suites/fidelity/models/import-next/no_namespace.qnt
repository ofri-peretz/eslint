// Model of eslint-plugin-import-next/no-namespace.
// A convention: modules are imported by name, not as a namespace object.
// The finding is a namespace import (`import * as ns`, `import type * as
// ns`, `import d, * as ns`) whose module specifier no `ignore` glob matches
// (`*` matches any run of characters). Named and default imports, and the
// re-export `export * as ns from 'm'` (not an import), are silent.
module no_namespace {
  type Form = Namespace | TypeNamespace | DefaultAndNamespace | Named | Default | ExportAllAs
  type Source = Pkg | Css | Scoped
  type Ignore = NoIgnore | Exact | Glob | OtherIgnore

  pure def ignored(src: Source, i: Ignore): bool =
    (i == Exact and src == Pkg) or (i == Glob and src == Css)

  pure def reports(f: Form, src: Source, i: Ignore): bool =
    Set(Namespace, TypeNamespace, DefaultAndNamespace).contains(f) and not(ignored(src, i))

  var form: Form
  var source: Source
  var ignore: Ignore
  var verdict: bool

  action step = {
    nondet f = Set(Namespace, TypeNamespace, DefaultAndNamespace, Named, Default, ExportAllAs).oneOf()
    nondet s = Set(Pkg, Css, Scoped).oneOf()
    nondet i = Set(NoIgnore, Exact, Glob, OtherIgnore).oneOf()
    all { form' = f, source' = s, ignore' = i, verdict' = reports(f, s, i) }
  }

  action init = step
}
