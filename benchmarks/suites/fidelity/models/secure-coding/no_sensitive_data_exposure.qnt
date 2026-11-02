// Model of eslint-plugin-secure-coding/no-sensitive-data-exposure (CWE-532).
// The prose doc is an empty template; the contract here is the options schema
// and the CWE: a value whose name holds a secret (password, token, api key)
// reaching console.log (while checkConsoleLog) or an Error message (while
// checkErrorMessages) is reported. A name whose FINAL segment is a descriptor
// (passwordError) describes a secret rather than holding one; a non-secret
// name (username) is not sensitive.
module no_sensitive_data_exposure {
  type Sink = ConsoleLog | ThrowError
  type Value = Password | ApiKey | AccessToken | Descriptor | Neutral

  pure def sensitive(v: Value): bool = Set(Password, ApiKey, AccessToken).contains(v)

  pure def reports(k: Sink, v: Value, checkConsole: bool, checkErrors: bool): bool =
    sensitive(v) and ((k == ConsoleLog and checkConsole) or (k == ThrowError and checkErrors))

  var sink: Sink
  var value: Value
  var checkConsole: bool
  var checkErrors: bool
  var verdict: bool

  action step = {
    nondet k = Set(ConsoleLog, ThrowError).oneOf()
    nondet v = Set(Password, ApiKey, AccessToken, Descriptor, Neutral).oneOf()
    nondet c = Set(true, false).oneOf()
    nondet e = Set(true, false).oneOf()
    all { sink' = k, value' = v, checkConsole' = c, checkErrors' = e, verdict' = reports(k, v, c, e) }
  }

  action init = step
}
