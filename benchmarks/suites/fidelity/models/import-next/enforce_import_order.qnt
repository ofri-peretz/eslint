// Model of eslint-plugin-import-next/enforce-import-order (also exported as
// `order`). Import declarations follow the configured group order, are
// alphabetized inside a group, and groups are separated as configured. Each
// input is two adjacent import declarations, `first` then `second`.
//
// Groups (default order builtin, external, internal, parent, sibling, index,
// side-effect):
//   - builtin: a Node.js builtin in any spelling (`node:path`, `fs`,
//     `crypto`, `fs/promises`) - Node's own builtin list, not a short list;
//   - internal: matches an `internalPatterns` regex (default `^@/`);
//   - parent: `..` or `../x`; sibling: `./x`; index: `./`, `./index`,
//     `./index.js` (the directory's own index);
//   - side-effect: an import that binds nothing (`import './setup'`);
//   - type: a statement-level `import type`, only when `groups` lists
//     `type` - otherwise a type import is grouped by its path;
//   - external: everything else.
// `alphabetize.order` asc (default) / desc / ignore orders same-group
// imports by specifier; `caseInsensitive` (default true) compares lowercased,
// false compares code units (`Zed` before `react`). `newlinesBetween`
// always (default) wants a blank line between groups, never forbids one,
// ignore checks neither.
//
// Left out (judgment): blank lines inside one group, `require()` ordering.
module enforce_import_order {
  type Focus = Classify | Options
  type Kind = NodeProto | BareFs | Crypto | FsPromises | React | Zed | Internal | Parent
    | ParentBare | Sibling | Index | IndexJs | IndexSlash | TypeExt | TypeSib | SideEffect
  type Config = Defaults | Desc | AlphaIgnore | CaseSensitive | NeverNL | IgnoreNL | TypeGroups

  pure def group(k: Kind, c: Config): str =
    if (Set(NodeProto, BareFs, Crypto, FsPromises).contains(k)) "builtin"
    else if (Set(React, Zed).contains(k)) "external"
    else if (k == Internal) "internal"
    else if (Set(Parent, ParentBare).contains(k)) "parent"
    else if (k == Sibling) "sibling"
    else if (Set(Index, IndexJs, IndexSlash).contains(k)) "index"
    else if (k == SideEffect) "side-effect"
    else if (c == TypeGroups) "type"
    else if (k == TypeExt) "external"
    else "sibling"

  pure def rank(g: str, c: Config): int =
    if (c == TypeGroups)
      if (g == "builtin") 0 else if (g == "external") 1 else if (g == "type") 2
      else if (g == "internal") 3 else if (g == "parent") 4 else if (g == "sibling") 5
      else if (g == "index") 6 else 7
    else
      if (g == "builtin") 0 else if (g == "external") 1 else if (g == "internal") 2
      else if (g == "parent") 3 else if (g == "sibling") 4 else if (g == "index") 5 else 6

  // Position of the specifier in sorted order, among the kinds that can share
  // a group: crypto < fs < fs/promises < node:path; .. < ../up;
  // ./ < ./index < ./index.js; ./sib < ./types; ./types < ext-types (type
  // group); ext-types < react < Zed lowercased, but Zed < ext-types < react
  // by code unit.
  pure def alpha(k: Kind, c: Config): int =
    if (k == Crypto) 0 else if (k == BareFs) 1 else if (k == FsPromises) 2 else if (k == NodeProto) 3
    else if (k == ParentBare) 0 else if (k == Parent) 1
    else if (k == IndexSlash) 0 else if (k == Index) 1 else if (k == IndexJs) 2
    else if (k == Sibling) 0
    else if (k == TypeSib) 1
    else if (c == CaseSensitive) (if (k == Zed) 0 else if (k == TypeExt) 1 else 2)
    else if (k == TypeExt) 2
    else if (k == React) 3 else 4

  pure def reports(a: Kind, b: Kind, blank: bool, c: Config): bool =
    val ga = group(a, c)
    val gb = group(b, c)
    val ra = rank(ga, c)
    val rb = rank(gb, c)
    val wrongAlpha =
      if (c == AlphaIgnore) false
      else if (c == Desc) alpha(a, c) < alpha(b, c)
      else alpha(a, c) > alpha(b, c)
    val outOfOrder = ra > rb or (ra == rb and wrongAlpha)
    val newlineIssue = ra != rb and (
      if (c == NeverNL) blank else if (c == IgnoreNL) false else not(blank))
    outOfOrder or newlineIssue

  var focus: Focus
  var first: Kind
  var second: Kind
  var blank: bool
  var config: Config
  var verdict: bool

  action classify = {
    val kinds = Set(NodeProto, BareFs, Crypto, FsPromises, React, Zed, Internal, Parent,
      ParentBare, Sibling, Index, IndexJs, IndexSlash)
    nondet a = kinds.oneOf()
    nondet b = kinds.exclude(Set(a)).oneOf()
    nondet bl = Set(true, false).oneOf()
    all {
      focus' = Classify, first' = a, second' = b, blank' = bl, config' = Defaults,
      verdict' = reports(a, b, bl, Defaults),
    }
  }

  action options = {
    val kinds = Set(NodeProto, React, Zed, Sibling, TypeExt, TypeSib, SideEffect)
    nondet a = kinds.oneOf()
    nondet b = kinds.exclude(Set(a)).oneOf()
    nondet bl = Set(true, false).oneOf()
    nondet c = Set(Desc, AlphaIgnore, CaseSensitive, NeverNL, IgnoreNL, TypeGroups).oneOf()
    all {
      focus' = Options, first' = a, second' = b, blank' = bl, config' = c,
      verdict' = reports(a, b, bl, c),
    }
  }

  action step = any { classify, options }
  action init = step
}
