// Model of eslint-plugin-browser-security/no-allow-arbitrary-loads (CWE-295).
// Contract: an object property whose key is exactly one of `insecureLoadKeys`
// (default: Apple's ATS opt-out keys; the option replaces the list) set to
// `true` is reported, however the key is spelled (identifier, string, computed
// literal). `false`, NSTemporaryException..., and the old `allowArbitraryLoads`
// are not opt-outs.
module no_allow_arbitrary_loads {
  type Key = AL | ALWeb | ALMedia | LocalNet | ExcInsecure | ThirdParty | Temporary | OldLower | CustomKey
  type Spelling = IdentKey | StringKey | ComputedKey
  type Opts = DefaultKeys | CustomKeys

  pure def listed(k: Key, o: Opts): bool = match o {
    | DefaultKeys => match k {
        | AL => true
        | ALWeb => true
        | ALMedia => true
        | LocalNet => true
        | ExcInsecure => true
        | ThirdParty => true
        | _ => false
      }
    | CustomKeys => k == CustomKey
  }

  pure def reports(k: Key, v: bool, s: Spelling, o: Opts): bool = v and listed(k, o)

  var key: Key
  var value: bool
  var spelling: Spelling
  var opts: Opts
  var verdict: bool

  action step = {
    nondet k = Set(AL, ALWeb, ALMedia, LocalNet, ExcInsecure, ThirdParty, Temporary, OldLower, CustomKey).oneOf()
    nondet v = Set(true, false).oneOf()
    nondet s = Set(IdentKey, StringKey, ComputedKey).oneOf()
    nondet o = Set(DefaultKeys, CustomKeys).oneOf()
    all { key' = k, value' = v, spelling' = s, opts' = o, verdict' = reports(k, v, s, o) }
  }

  action init = step
}
