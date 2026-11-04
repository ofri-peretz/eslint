// Model of eslint-plugin-operability/require-code-minification (CWE-656).
// A build config that turns minification off ships readable, larger bundles.
// The rule reports a minification setting (`minificationKeys`, default
// ['minimize', 'minify']: webpack writes `minimize`, Vite / Rollup / esbuild /
// Terser write `minify`) set to `false` - the literal or a const bound to it -
// in every spelling of the key: an identifier key, a quoted key, a static
// computed key, and a member assignment (`config.build.minify = false`, dotted
// or subscripted). It does not report:
//   - `true`, a tool name (`'esbuild'`), or a value the code does not prove
//     (a parameter): only an explicit `false` disables minification;
//   - other keys (`sourcemap: false`).
// `minificationKeys` REPLACES the default list.
module require_code_minification {
  type Spelling = IdentKey | QuotedKey | ComputedKey | Assign | AssignSubscript
  type Key = Minimize | Minify | Compress | Sourcemap
  type Value = False | ConstFalse | True | ToolName | Unknown
  type KeysOpt = DefaultKeys | CompressOnly

  pure def isKey(k: Key, o: KeysOpt): bool =
    if (o == DefaultKeys) Set(Minimize, Minify).contains(k) else k == Compress
  pure def reports(k: Key, v: Value, o: KeysOpt): bool =
    isKey(k, o) and Set(False, ConstFalse).contains(v)

  var spelling: Spelling
  var key: Key
  var value: Value
  var keysOpt: KeysOpt
  var verdict: bool

  action step = {
    nondet sp = Set(IdentKey, QuotedKey, ComputedKey, Assign, AssignSubscript).oneOf()
    nondet k = Set(Minimize, Minify, Compress, Sourcemap).oneOf()
    nondet v = Set(False, ConstFalse, True, ToolName, Unknown).oneOf()
    nondet o = Set(DefaultKeys, CompressOnly).oneOf()
    all { spelling' = sp, key' = k, value' = v, keysOpt' = o, verdict' = reports(k, v, o) }
  }

  action init = step
}
