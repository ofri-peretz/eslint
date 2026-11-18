// Model of eslint-plugin-import-next/enforce-node-protocol-usage
// (import/enforce-node-protocol-usage).
// A codebase picks one spelling for Node.js builtins and the rule holds every
// module load to it - type-only imports included, the spelling is the same:
//   - `always`: a builtin written without the `node:` scheme is the finding:
//     a name in Node's own builtin list (`fs`), or a builtin subpath in that
//     list (`fs/promises`).
//   - `never`: a builtin written WITH the scheme is the finding (`node:fs`,
//     `node:fs/promises`) - but only when the bare name is itself a builtin.
//     `node:test` exists only with the scheme; `test` would load the npm
//     package, so it is not a finding.
// Never a finding: a package (`lodash`), a relative path (`./fs`),
// `punycode/` (Node's documented way to load the npm package), and a `node:`
// specifier whose name is no builtin (`node:unicorn`).
module enforce_node_protocol_usage {
  type Form = Default | Namespace | Named | Renamed | TypeOnly | InlineType | SideEffect
    | ExportNamed | ExportAll | ExportAllAs | Require | Dynamic | ImportEquals
  type Spec = Bare | Subpath | Prefixed | PrefixedSubpath | SchemeOnly | FakePrefixed
    | TrailingSlash | Package | Relative
  type Mode = Always | Never

  pure def reports(f: Form, s: Spec, m: Mode): bool =
    if (m == Always) Set(Bare, Subpath).contains(s)
    else Set(Prefixed, PrefixedSubpath).contains(s)

  var form: Form
  var spec: Spec
  var mode: Mode
  var verdict: bool

  action step = {
    nondet f = Set(Default, Namespace, Named, Renamed, TypeOnly, InlineType, SideEffect,
      ExportNamed, ExportAll, ExportAllAs, Require, Dynamic, ImportEquals).oneOf()
    nondet s = Set(Bare, Subpath, Prefixed, PrefixedSubpath, SchemeOnly, FakePrefixed,
      TrailingSlash, Package, Relative).oneOf()
    nondet m = Set(Always, Never).oneOf()
    all { form' = f, spec' = s, mode' = m, verdict' = reports(f, s, m) }
  }

  action init = step
}
