// Model of eslint-plugin-import-next/prefer-modern-api.
// The user names outdated packages and their modern replacements
// (`customMappings`; `deprecated` is a package name or a package subpath).
// The rule reports every way a module is loaded or re-exported whose
// specifier is the deprecated package or path, or a subpath below it.
//
// Not a finding: a different package that shares a prefix (`old-lib-ng`), a
// sibling subpath (`kit/modern` when `kit/legacy` is deprecated), the package
// root above a deprecated subpath (`kit`), a relative path.
//
// Left out: candidate for change (fires on a guess). With `disableBuiltIn`
// false (the default) the rule also reports a built-in list of packages it
// judges outdated (moment, request, redux, joi, webpack, mocha, ...) - an
// opinion list, not something the code proves. The model samples the default
// only on packages outside that list.
// Left out (judgment): type-only imports of a listed package.
module prefer_modern_api {
  type Focus = Spellings | Options
  type Form = Default | Namespace | Named | Renamed | SideEffect
    | ExportNamed | ExportAll | ExportAllAs | Require | Dynamic | ImportEquals
  type Spec = Pkg | PkgSub | PrefixTwin | Scoped | ScopedSub | DeepPath | BelowDeepPath
    | DeepRoot | DeepSibling | Relative
  // customMappings for old-lib, @old/sdk and kit/legacy, with disableBuiltIn
  // true / false; or no custom mappings at all.
  type Config = CustomOnly | CustomAndBuiltIn | NoCustom

  pure def reports(s: Spec, c: Config): bool =
    c != NoCustom and Set(Pkg, PkgSub, Scoped, ScopedSub, DeepPath, BelowDeepPath).contains(s)

  var focus: Focus
  var form: Form
  var spec: Spec
  var config: Config
  var verdict: bool

  action spellings = {
    nondet f = Set(Default, Namespace, Named, Renamed, SideEffect,
      ExportNamed, ExportAll, ExportAllAs, Require, Dynamic, ImportEquals).oneOf()
    all { focus' = Spellings, form' = f, spec' = Pkg, config' = CustomOnly, verdict' = reports(Pkg, CustomOnly) }
  }

  action options = {
    nondet s = Set(Pkg, PkgSub, PrefixTwin, Scoped, ScopedSub, DeepPath, BelowDeepPath,
      DeepRoot, DeepSibling, Relative).oneOf()
    nondet c = Set(CustomOnly, CustomAndBuiltIn, NoCustom).oneOf()
    all { focus' = Options, form' = Default, spec' = s, config' = c, verdict' = reports(s, c) }
  }

  action step = any { spellings, options }
  action init = step
}
