// Model of eslint-plugin-import-next/order (import/order): eslint-plugin-
// import's `order`, its options and its defaults. Each input is two adjacent
// import declarations, `first` then `second`, optionally with a blank line
// between them. (import-next's own, opinionated ordering is the separate
// rule `enforce-import-order`, modelled in enforce_import_order.qnt.)
//
// Groups: builtin (a Node.js builtin in any spelling: `fs`, `node:path`),
// external (a package: `react`), parent (`../x`), sibling (`./x`), index
// (the directory's own index: `./`, `./index`). The default order is
// exactly that: builtin, external, parent, sibling, index.
//
// Defaults: an import is reported only when it sits after one of a later
// group. No alphabetizing, no blank-line policy. An import that binds
// nothing (`import './setup'`) is not ordered at all.
//
// Options:
//   - `alphabetize: { order: 'asc' }`: inside one group, too, specifiers go
//     in order (`fs` before `node:path`; `./` before `./index`);
//   - `newlines-between: 'always'`: a blank line between two groups, and
//     none inside one.
module order {
  type Kind = Fs | NodeProto | React | Parent | Sibling | Index | IndexSlash | SideEffect
  type Config = Defaults | Alpha | Newlines

  pure def rank(k: Kind): int =
    if (Set(Fs, NodeProto).contains(k)) 0
    else if (k == React) 1
    else if (k == Parent) 2
    else if (k == Sibling) 3
    else 4

  // Position among the kinds that share a group.
  pure def alpha(k: Kind): int =
    if (Set(Fs, IndexSlash).contains(k)) 0 else 1

  pure def reports(a: Kind, b: Kind, blank: bool, c: Config): bool =
    if (a == SideEffect or b == SideEffect) false
    else
      val outOfOrder = rank(a) > rank(b)
        or (c == Alpha and rank(a) == rank(b) and alpha(a) > alpha(b))
      val spacing = c == Newlines and (
        if (rank(a) == rank(b)) blank else not(blank))
      outOfOrder or spacing

  var first: Kind
  var second: Kind
  var blank: bool
  var config: Config
  var verdict: bool

  action step = {
    val kinds = Set(Fs, NodeProto, React, Parent, Sibling, Index, IndexSlash, SideEffect)
    nondet a = kinds.oneOf()
    nondet b = kinds.exclude(Set(a)).oneOf()
    nondet bl = Set(true, false).oneOf()
    nondet c = Set(Defaults, Alpha, Newlines).oneOf()
    all {
      first' = a, second' = b, blank' = bl, config' = c,
      verdict' = reports(a, b, bl, c),
    }
  }

  action init = step
}
