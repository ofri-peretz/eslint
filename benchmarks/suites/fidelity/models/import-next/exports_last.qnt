// Model of eslint-plugin-import-next/exports-last.
// Export statements (`export { a }`, `export default a`, `export * from`)
// come after every other statement. A file is three statements; an export
// statement followed by a non-export statement is the finding. An inline
// declaration export (`export const x = 1`) is exempt by the rule's design:
// it is not reported, and it is still an export, so it is no wall either.
// left out (judgment): an `import` after an export (imports are hoisted).
module exports_last {
  type Stmt = Plain | ExportList | ExportDefault | ExportAll | ExportInline

  pure def movable(s: Stmt): bool = Set(ExportList, ExportDefault, ExportAll).contains(s)

  pure def reports(a: Stmt, b: Stmt, c: Stmt): bool =
    (movable(a) and (b == Plain or c == Plain)) or (movable(b) and c == Plain)

  var s1: Stmt
  var s2: Stmt
  var s3: Stmt
  var verdict: bool

  action step = {
    nondet a = Set(Plain, ExportList, ExportDefault, ExportAll, ExportInline).oneOf()
    nondet b = Set(Plain, ExportList, ExportDefault, ExportAll, ExportInline).oneOf()
    nondet c = Set(Plain, ExportList, ExportDefault, ExportAll, ExportInline).oneOf()
    all { s1' = a, s2' = b, s3' = c, verdict' = reports(a, b, c) }
  }

  action init = step
}
