// Model of eslint-plugin-import-next/no-named-default.
// A default export has its own import spelling (`import x from 'm'`), so
// taking it through the named block (`import { default as x } from 'm'`) is
// the finding, however `default` is written (identifier or string literal)
// and whether the import is a value or a type import (`import type x from
// 'm'` is the equivalent). Other named imports and a re-export
// (`export { default as x } from 'm'`, not an import) are silent.
module no_named_default {
  type Imported = DefaultIdent | DefaultString | Other
  type Kind = Value | TypeOnly | InlineType | Reexport

  pure def reports(i: Imported, k: Kind): bool =
    i != Other and k != Reexport

  var imported: Imported
  var kind: Kind
  var verdict: bool

  action step = {
    nondet i = Set(DefaultIdent, DefaultString, Other).oneOf()
    nondet k = Set(Value, TypeOnly, InlineType, Reexport).oneOf()
    all { imported' = i, kind' = k, verdict' = reports(i, k) }
  }

  action init = step
}
