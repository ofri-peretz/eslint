// Model of eslint-plugin-import-next/prefer-tree-shakeable-imports.
// For a package the user lists in `targetPackages`, an import that pulls in
// the whole package defeats tree-shaking. The rule reports a namespace import
// of a listed package or one of its subpaths, and a default import of the
// listed package itself. With `blockAllNamespaceImports` it reports every
// namespace import, listed or not. `subpathPattern` and `preferNamed` only
// shape the message.
//
// Not a finding: named imports, a default import of a subpath (the
// recommended `import debounce from 'lodash/debounce'`), side-effect imports,
// and type-only imports - `import type Big from 'big'` and
// `import type * as B from 'big'` are erased and bundle nothing.
//
// Left out: candidate for change (fires on a guess). The default
// `targetPackages` is a built-in list of packages the rule judges large
// (lodash, @mui/material, date-fns, rxjs, antd, ...): an opinion list, not
// something the code proves. The model samples configured lists only.
// Left out (judgment): `import()`, `export * as ns`, CommonJS forms.
module prefer_tree_shakeable_imports {
  type Form = Default | Namespace | Named | Renamed | TypeDefault | TypeNamespace
    | DefaultAndNamed | SideEffect
  type Spec = Exact | Subpath | PrefixTwin | Relative
  // targetPackages [{ name: 'big' }] / [], each with blockAllNamespaceImports
  // false (default) / true.
  type Config = Configured | ConfiguredBlockAll | Empty | EmptyBlockAll

  pure def listed(s: Spec, c: Config): bool =
    Set(Configured, ConfiguredBlockAll).contains(c) and Set(Exact, Subpath).contains(s)

  pure def reports(f: Form, s: Spec, c: Config): bool =
    if (f == Namespace) listed(s, c) or Set(ConfiguredBlockAll, EmptyBlockAll).contains(c)
    else if (Set(Default, DefaultAndNamed).contains(f)) listed(s, c) and s == Exact
    else false

  var form: Form
  var spec: Spec
  var config: Config
  var verdict: bool

  action step = {
    nondet f = Set(Default, Namespace, Named, Renamed, TypeDefault, TypeNamespace,
      DefaultAndNamed, SideEffect).oneOf()
    nondet s = Set(Exact, Subpath, PrefixTwin, Relative).oneOf()
    nondet c = Set(Configured, ConfiguredBlockAll, Empty, EmptyBlockAll).oneOf()
    all { form' = f, spec' = s, config' = c, verdict' = reports(f, s, c) }
  }

  action init = step
}
