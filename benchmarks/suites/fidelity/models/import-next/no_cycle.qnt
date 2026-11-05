// Model of eslint-plugin-import-next/no-cycle (CWE-1047).
// Reports an import in the linted module (src/app.ts) whose target imports
// the linted module back, directly or through other modules, by RUNTIME
// edges: a cycle the module loader has to resolve while modules are still
// initializing. An edge is runtime when it survives compilation:
//   - value imports (default, named value, namespace), side-effect imports,
//     `export { x } from`, `export *`, `export * as`, `require()` and TS
//     `import x = require()` are runtime edges;
//   - `import type`, `export type { T } from` are erased;
//   - an inline `import { type T }` is erased unless `verbatimModuleSyntax`
//     (tsc then emits `import {} from`);
//   - a plain `import { T }` of an interface is erased (TypeScript elides
//     imports used only as types) unless `verbatimModuleSyntax`, which keeps
//     every statement that is not `import type`; the same holds when the
//     interface arrives through a barrel (`export * from`), whose re-exports
//     carry each name's kind from the module that declares it;
//   - `import()` loads lazily, after both modules finished initializing: not
//     an initialization cycle (judgment: silent).
// Every binding the linted file imports is used as a value, so no import is
// elided for being unused.
//
// Options: `ignorePatterns` (default: test / spec / stories files) skips
// linting a matching file; `maxDepth` (default unlimited) bounds how many
// imports deep the back edge may be: 1 finds only A -> B -> A.
// `reportAllCycles`, `fixStrategy` and the naming options shape the message,
// not the verdict.
module no_cycle {
  type Focus = Grid | Hops
  type Out = ODefault | ONamed | ONamedType | OInlineType | OTypeOnly | OSideEffect | ONamespace
           | OExportNamed | OExportAll | OExportAllAs | ORequire | ODynamic | OImportEquals
  type Back = BValue | BTypeOnly | BInlineType | BImplicitType | BSideEffect | BExportNamed
            | BExportType | BExportAll | BRequire | BDynamic | BNone | BBarrelType | BBarrelValue
  type Opts = Default | Verbatim | TestDefault | TestNoIgnore | DepthOne | DepthTen
  type Len = Two | Three

  pure def outRuntime(f: Out, o: Opts): bool =
    if (f == OTypeOnly or f == ONamedType or f == ODynamic) false
    else if (f == OInlineType) o == Verbatim
    else true

  pure def backRuntime(b: Back, o: Opts): bool =
    if (Set(BTypeOnly, BExportType, BDynamic, BNone).contains(b)) false
    else if (b == BInlineType or b == BImplicitType or b == BBarrelType) o == Verbatim
    else true

  pure def reports(f: Out, b: Back, o: Opts, l: Len): bool =
    o != TestDefault and outRuntime(f, o) and backRuntime(b, o)
      and not(o == DepthOne and l == Three)

  var focus: Focus
  var out: Out
  var back: Back
  var opts: Opts
  var len: Len
  var verdict: bool

  action step = {
    nondet fc = Set(Grid, Hops).oneOf()
    nondet f0 = Set(ODefault, ONamed, ONamedType, OInlineType, OTypeOnly, OSideEffect, ONamespace,
                    OExportNamed, OExportAll, OExportAllAs, ORequire, ODynamic, OImportEquals).oneOf()
    nondet b0 = Set(BValue, BTypeOnly, BInlineType, BImplicitType, BSideEffect, BExportNamed,
                    BExportType, BExportAll, BRequire, BDynamic, BNone, BBarrelType, BBarrelValue).oneOf()
    nondet o0 = Set(Default, Verbatim, TestDefault, TestNoIgnore).oneOf()
    nondet o1 = Set(Default, DepthOne, DepthTen).oneOf()
    nondet l1 = Set(Two, Three).oneOf()
    val f = if (fc == Grid) f0 else ONamed
    val b = if (fc == Grid) b0 else BValue
    val o = if (fc == Grid) o0 else o1
    val l = if (fc == Grid) Two else l1
    all {
      focus' = fc, out' = f, back' = b, opts' = o, len' = l,
      verdict' = reports(f, b, o, l),
    }
  }

  action init = step
}
