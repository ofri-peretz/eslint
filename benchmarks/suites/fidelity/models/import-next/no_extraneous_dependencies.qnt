// Model of eslint-plugin-import-next/no-extraneous-dependencies.
// A package specifier must name a package the nearest manifest declares: a
// runtime import of an undeclared package works only by accident (hoisting)
// and breaks for a consumer. The manifest is the nearest package.json that
// declares a package (a `name` or any dependency field); a nameless
// `{"type":"module"}` scope marker in a sub-folder is not one.
//
// Allowed: `dependencies`; `devDependencies`, `optionalDependencies`,
// `peerDependencies`, `bundledDependencies` / `bundleDependencies` (npm
// accepts both spellings) while their option is true (the default); the
// package's own name (Node self-reference through `exports`).
//
// Never checked: Node builtins (`fs/promises`, `node:fs`), relative paths,
// `#imports`, URL schemes (`virtual:x`). Erased at compile time, so never
// reported: `import type`, `export type ... from`, and an import whose
// specifiers are all inline `type` (unless `verbatimModuleSyntax`, which keeps
// it as `import {} from 'pkg'`).
//
// Every runtime spelling is checked: default / named / namespace / side-effect
// imports, `export { a } from`, `export *`, `export * as`, `require()`,
// `import()`, TS `import x = require()`.
//
// Left out (decides by name, not structure): `resolutionStrategy:
// 'workspace' | 'monorepo'` silencing the literal `@workspace/` and
// `@company/` scopes. Those strategies are modelled only on other names,
// where they behave like `strict`.
module no_extraneous_dependencies {
  type Focus = Grid | ShapeF
  type Form = Default | Named | Namespace | SideEffect | TypeOnly | InlineType | ExportType
            | ExportNamed | ExportAll | ExportAllAs | Require | Dynamic | ImportEquals
  type Listing = Deps | Dev | Optional | Peer | Bundled | BundleAlt | None | Self
  type Opts = Defaults | NoDev | NoOptional | NoPeer | NoBundled | Verbatim | Workspace
  type Shape = Bare | Subpath | Scoped | ScopedSubpath | Marker
             | Builtin | NodeBuiltin | Relative | Hash | Protocol

  pure def erased(f: Form, o: Opts): bool =
    f == TypeOnly or f == ExportType or (f == InlineType and o != Verbatim)

  pure def allowed(l: Listing, o: Opts): bool =
    l == Deps or l == Self
      or (l == Dev and o != NoDev)
      or (l == Optional and o != NoOptional)
      or (l == Peer and o != NoPeer)
      or ((l == Bundled or l == BundleAlt) and o != NoBundled)

  pure def packageShape(sh: Shape): bool =
    Set(Bare, Subpath, Scoped, ScopedSubpath, Marker).contains(sh)

  pure def reports(f: Form, l: Listing, o: Opts, sh: Shape): bool =
    packageShape(sh) and not(erased(f, o)) and not(allowed(l, o))

  var focus: Focus
  var form: Form
  var listing: Listing
  var opts: Opts
  var shape: Shape
  var verdict: bool

  action step = {
    nondet fc = Set(Grid, ShapeF).oneOf()
    nondet f0 = Set(Default, Named, Namespace, SideEffect, TypeOnly, InlineType, ExportType,
                    ExportNamed, ExportAll, ExportAllAs, Require, Dynamic, ImportEquals).oneOf()
    nondet l0 = Set(Deps, Dev, Optional, Peer, Bundled, BundleAlt, None, Self).oneOf()
    nondet o0 = Set(Defaults, NoDev, NoOptional, NoPeer, NoBundled, Verbatim, Workspace).oneOf()
    nondet sh0 = Set(Subpath, Scoped, ScopedSubpath, Marker, Builtin, NodeBuiltin, Relative, Hash, Protocol).oneOf()
    nondet l1 = Set(Deps, None).oneOf()
    val f = if (fc == Grid) f0 else Default
    val l = if (fc == Grid) l0 else l1
    val o = if (fc == Grid) o0 else Defaults
    val sh = if (fc == Grid) Bare else sh0
    all {
      focus' = fc, form' = f, listing' = l, opts' = o, shape' = sh,
      verdict' = reports(f, l, o, sh),
    }
  }

  action init = step
}
