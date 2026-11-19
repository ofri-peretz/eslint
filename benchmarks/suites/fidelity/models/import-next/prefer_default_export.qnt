// Model of eslint-plugin-import-next/prefer-default-export.
// `target: single` (default): a module whose exports are exactly ONE value
// name and no default should export it as the default. Every value name
// counts - inline declarations (also enum, also destructured: one per bound
// name), export lists, and `export { x } from 'm'` re-exports. A default in
// any spelling (`export default`, `export { x as default }`, `export {
// default } from 'm'`) satisfies it. `export * from 'm'` exports names the
// file cannot see: the count is unknown, so `single` is silent. A module that
// exports a type is never reported, under any target: a type alias cannot be
// its default export, so it needs named exports anyway (eslint-plugin-import's
// own rule, and its valid case `export interface foo {}; export function goo()
// {}`). `as-needed` means `single`. `always`: any value named export
// without a default is the finding. `ignoreFiles` (substring or glob) and
// `allowNamedExports: true` exempt.
module prefer_default_export {
  type Exp = None | Const | Enum | DestructuredOne | DestructuredTwo | Specifier | AsDefault
    | Default | ReexportNamed | ReexportDefault | ExportAll | TypeAlias | Interface | TypeSpecifier
  type Opts = Defaults | Always | AsNeeded | IgnoreSubstring | IgnoreGlob | AllowNamed

  pure def names(e: Exp): int =
    if (Set(Const, Enum, DestructuredOne, Specifier, ReexportNamed).contains(e)) 1
    else if (e == DestructuredTwo) 2
    else 0
  pure def isDefault(e: Exp): bool = Set(AsDefault, Default, ReexportDefault).contains(e)

  pure def reports(a: Exp, b: Exp, o: Opts): bool =
    val n = names(a) + names(b)
    val hasDefault = isDefault(a) or isDefault(b)
    val unknown = a == ExportAll or b == ExportAll
    val exportsType = Set(TypeAlias, Interface, TypeSpecifier).contains(a) or b == TypeAlias
    if (exportsType) false
    else if (o == Always) not(hasDefault) and n > 0
    else if (o == Defaults or o == AsNeeded) not(hasDefault) and not(unknown) and n == 1
    else false

  var e1: Exp
  var e2: Exp
  var opts: Opts
  var verdict: bool

  action step = {
    nondet a = Set(None, Const, Enum, DestructuredOne, DestructuredTwo, Specifier, AsDefault,
      Default, ReexportNamed, ReexportDefault, ExportAll, TypeAlias, Interface, TypeSpecifier).oneOf()
    nondet b = Set(None, Const, Default, ReexportNamed, ExportAll, TypeAlias, AsDefault).oneOf()
    nondet o = Set(Defaults, Always, AsNeeded, IgnoreSubstring, IgnoreGlob, AllowNamed).oneOf()
    all { e1' = a, e2' = b, opts' = o, verdict' = reports(a, b, o) }
  }

  action init = step
}
