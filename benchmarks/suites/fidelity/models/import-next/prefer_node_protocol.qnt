// Model of eslint-plugin-import-next/prefer-node-protocol.
// A Node.js builtin is spelled with the `node:` scheme, so it can never be
// shadowed by a same-named package in node_modules. The rule reports every way
// a module is loaded or re-exported - type-only imports included, the spelling
// is the same - whose specifier is a Node.js builtin written without the
// scheme: a name in Node's own builtin module list (`fs`, `worker_threads`), a
// builtin subpath in that list (`fs/promises`), or a name the user adds with
// `additionalModules`.
//
// Not a finding:
//   - a specifier that already has the scheme (`node:fs`);
//   - a specifier that is not a builtin, even if it starts with a builtin's
//     name: `events/foo` is not a builtin subpath, so it resolves to the npm
//     package `events`; `punycode/` (trailing slash) is Node's documented way
//     to load the npm package instead of the builtin; `FS` is not a builtin
//     (builtin names are case-sensitive); `./fs` is a relative path.
module prefer_node_protocol {
  type Form = Default | Namespace | Named | Renamed | TypeOnly | InlineType | SideEffect
    | ExportNamed | ExportAll | ExportAllAs | Require | Dynamic | ImportEquals
  type Spec = Bare | Uncommon | Subpath | Prefixed | Upper | FakeSubpath | TrailingSlash
    | Package | Relative | Custom
  // additionalModules: [] / ['custom-builtin'].
  type Config = Defaults | Additional

  pure def reports(f: Form, s: Spec, c: Config): bool =
    Set(Bare, Uncommon, Subpath).contains(s) or (s == Custom and c == Additional)

  var form: Form
  var spec: Spec
  var config: Config
  var verdict: bool

  action step = {
    nondet f = Set(Default, Namespace, Named, Renamed, TypeOnly, InlineType, SideEffect,
      ExportNamed, ExportAll, ExportAllAs, Require, Dynamic, ImportEquals).oneOf()
    nondet s = Set(Bare, Uncommon, Subpath, Prefixed, Upper, FakeSubpath, TrailingSlash,
      Package, Relative, Custom).oneOf()
    nondet c = Set(Defaults, Additional).oneOf()
    all { form' = f, spec' = s, config' = c, verdict' = reports(f, s, c) }
  }

  action init = step
}
