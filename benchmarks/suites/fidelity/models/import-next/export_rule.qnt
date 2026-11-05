// Model of eslint-plugin-import-next/export (import/export).
// A module may export each name once per declaration space, and has one
// default export. The rule reports two exports of one name that TypeScript
// rejects as a duplicate, and a second default export. It decides by the
// KIND of each export, as TypeScript's declaration-merging table does:
//
//   - a value (const/let/var, a destructured binding, a function, an export
//     specifier of a local value, a re-export, `export * as`) and a pure type
//     (interface, type alias) live in different spaces: legal;
//   - merges: interface + interface, class + interface, enum + enum (when
//     at most one of them omits its first member's initializer: two
//     `enum E { A }` are an error), and a namespace with a function, class,
//     enum, interface, type alias or namespace (TypeScript also accepts a
//     namespace beside a type-only export specifier);
//   - every other pair of the same name is a duplicate - including an export
//     specifier (an alias, even `export type { T as N }`) beside any value,
//     and a class or enum beside a type alias, since both occupy the type
//     space too.
//   - a namespace of types only (`export namespace N { export type T = 1 }`)
//     declares no value: it merges with every other export of the name
//     except `export * as N` (TS2440);
//   - A re-export (`export { x as N } from './m'`) beside a pure type is
//     legal only when `x` is a value, which this file cannot see: silent.
//     (`export * from` collisions need the other modules: out of scope.)
//
// Defaults: `export default`, `export { v as default }` and
// `export { default } from './m'` are each a default export; two of them is
// a duplicate. `export * from` never re-exports a default.
// A different name is never a duplicate (safe twin of every pair).
module export_rule {
  type Kind = Const | Function | Class | Interface | TypeAlias | Enum | EnumBare | Namespace | TypeNamespace
            | Specifier | TypeSpecifier | Reexport | StarAs | Destructured
  type Dflt = NoDefault | OneDecl | DeclDecl | DeclSpec | SpecSpec | ReexportAndDecl | StarAndDecl
  type Focus = Pairs | Defaults

  pure def valueish(k: Kind): bool =
    Set(Const, Function, Destructured, Specifier, Reexport, StarAs).contains(k)
  pure def pureType(k: Kind): bool = Set(Interface, TypeAlias).contains(k)
  pure def is(a: Kind, b: Kind, x: Kind, y: Kind): bool =
    (a == x and b == y) or (a == y and b == x)
  pure def legal(a: Kind, b: Kind): bool = or {
    (a == TypeNamespace or b == TypeNamespace) and a != StarAs and b != StarAs,
    valueish(a) and pureType(b),
    valueish(b) and pureType(a),
    is(a, b, Interface, Interface),
    is(a, b, Class, Interface),
    is(a, b, Enum, Enum),
    is(a, b, Enum, EnumBare),
    is(a, b, Namespace, Namespace),
    is(a, b, Namespace, Function),
    is(a, b, Namespace, Class),
    is(a, b, Namespace, Enum),
    is(a, b, Namespace, EnumBare),
    is(a, b, Namespace, Interface),
    is(a, b, Namespace, TypeAlias),
    is(a, b, Namespace, TypeSpecifier),
  }
  pure def reports(fo: Focus, a: Kind, b: Kind, same: bool, d: Dflt): bool =
    if (fo == Pairs) same and not(legal(a, b))
    else Set(DeclDecl, DeclSpec, SpecSpec, ReexportAndDecl).contains(d)

  var focus: Focus
  var first: Kind
  var second: Kind
  var sameName: bool
  var dflt: Dflt
  var verdict: bool

  action step = {
    nondet fo = Set(Pairs, Defaults).oneOf()
    val kinds = if (fo == Pairs)
                  Set(Const, Function, Class, Interface, TypeAlias, Enum, EnumBare, Namespace, TypeNamespace,
                      Specifier, TypeSpecifier, Reexport, StarAs, Destructured)
                else Set(Const)
    nondet a = kinds.oneOf()
    nondet b = kinds.oneOf()
    nondet sm = (if (fo == Pairs) Set(true, false) else Set(false)).oneOf()
    nondet d = (if (fo == Defaults)
                  Set(NoDefault, OneDecl, DeclDecl, DeclSpec, SpecSpec, ReexportAndDecl, StarAndDecl)
                else Set(NoDefault)).oneOf()
    all { focus' = fo, first' = a, second' = b, sameName' = sm, dflt' = d,
          verdict' = reports(fo, a, b, sm, d) }
  }

  action init = step
}
