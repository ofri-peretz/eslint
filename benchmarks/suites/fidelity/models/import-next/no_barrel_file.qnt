// Model of eslint-plugin-import-next/no-barrel-file: a configured convention.
// A barrel candidate is a file matching `barrelPatterns` (default: an
// `index.(ts|tsx|js|jsx|mts|mjs)` file) and no `allowedPaths` entry. It is
// reported when it re-exports at least `threshold` (default 3) distinct
// modules and:
//   - has no local export, or
//   - has local exports, `allowWithLocalExports` is false, and re-export
//     declarations are at least `reexportRatio` (default 0.8) of all export
//     declarations.
// A re-export is any way a module's runtime binding is passed through:
// `export * from`, `export * as ns from`, `export { a } from`, and an
// imported binding exported again (`import { a } ...; export { a }`,
// `import * as ns ...; export { ns }`, `import x ...; export default x`).
// A type-only re-export (`export type * from`, `export type { T } from`) is
// erased at compile time: it costs the bundle nothing and is not counted.
module no_barrel_file {
  type Spelling = StarFrom | StarAs | NamedFrom | ImportThenExport | NamespaceThenExport
                | DefaultThenExportDefault | TypeStar | TypeNamed
  type Opts = Default | Threshold2 | AllowLocal | Ratio05 | Allowed | Patterns

  pure def runtime(sp: Spelling): bool = not(Set(TypeStar, TypeNamed).contains(sp))

  pure def reports(sp: Spelling, n: int, local: bool, o: Opts): bool =
    val threshold = if (o == Threshold2) 2 else 3
    val sources = if (runtime(sp)) n else 0
    // declarations: n re-exports (when runtime), plus one local export
    val ratioOk = if (o == Ratio05) 2 * sources >= sources + 1 else 10 * sources >= 8 * (sources + 1)
    o != Allowed and sources >= threshold
      and (not(local) or (o != AllowLocal and ratioOk))

  var spelling: Spelling
  var count: int
  var local: bool
  var opts: Opts
  var verdict: bool

  action step = {
    nondet sp = Set(StarFrom, StarAs, NamedFrom, ImportThenExport, NamespaceThenExport,
                    DefaultThenExportDefault, TypeStar, TypeNamed).oneOf()
    nondet n = Set(2, 3).oneOf()
    nondet l = Set(true, false).oneOf()
    nondet o = Set(Default, Threshold2, AllowLocal, Ratio05, Allowed, Patterns).oneOf()
    all { spelling' = sp, count' = n, local' = l, opts' = o, verdict' = reports(sp, n, l, o) }
  }

  action init = step
}
