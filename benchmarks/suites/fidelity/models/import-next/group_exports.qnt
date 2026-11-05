// Model of eslint-plugin-import-next/group-exports.
// Named export LISTS of one kind belong in one statement: two local
// `export { ... }` lists, or two `export { ... } from 'm'` lists from the same
// source, are the finding. Type-only lists (`export type { T }`) group
// separately from value lists: merging them takes inline `type` modifiers, a
// style the user did not ask for, so a value list next to a type list is
// silent. Inline declaration exports (`export const`), `export default`,
// `export * from` and re-exports from different sources are not lists to
// merge.
module group_exports {
  type Stmt = ValueList | TypeList | Inline | ReexportSame | TypeReexportSame | ReexportOther | Default | ExportAll

  pure def reports(a: Stmt, b: Stmt): bool =
    a == b and Set(ValueList, TypeList, ReexportSame, TypeReexportSame).contains(a)

  var s1: Stmt
  var s2: Stmt
  var verdict: bool

  action step = {
    nondet a = Set(ValueList, TypeList, Inline, ReexportSame, TypeReexportSame, ReexportOther, Default, ExportAll).oneOf()
    nondet b = Set(ValueList, TypeList, Inline, ReexportSame, TypeReexportSame, ReexportOther, Default, ExportAll).oneOf()
    all { s1' = a, s2' = b, verdict' = reports(a, b) }
  }

  action init = step
}
