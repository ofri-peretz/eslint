// Model of eslint-plugin-node-security/no-insecure-key-derivation (CWE-916).
// pbkdf2 / pbkdf2Sync with a statically known iteration count below
// minIterations (default 100000) is reported, however the function is reached
// and however the number is written (separators, exponent, a const in the same
// file). A runtime value is not judged.
module no_insecure_key_derivation {
  type Callee = Pbkdf2Dot | Pbkdf2SyncDot | Bracket | NamedImport | RenamedImport | RequireNode | Scrypt
  type Iter = Lit1000 | Lit99999 | Lit100000 | Lit600000 | Separator10k | Exponent1e4 | ConstLow | Runtime

  // iteration count, or -1 when unknown at lint time
  pure def value(i: Iter): int = match i {
    | Lit1000 => 1000
    | Lit99999 => 99999
    | Lit100000 => 100000
    | Lit600000 => 600000
    | Separator10k => 10000
    | Exponent1e4 => 10000
    | ConstLow => 5000
    | Runtime => -1
  }

  pure def reports(c: Callee, i: Iter, strict: bool): bool = {
    val min = if (strict) 600000 else 100000
    c != Scrypt and value(i) >= 0 and value(i) < min
  }

  var callee: Callee
  var iter: Iter
  var strict: bool
  var verdict: bool

  action step = {
    nondet c = Set(Pbkdf2Dot, Pbkdf2SyncDot, Bracket, NamedImport, RenamedImport, RequireNode, Scrypt).oneOf()
    nondet i = Set(Lit1000, Lit99999, Lit100000, Lit600000, Separator10k, Exponent1e4, ConstLow, Runtime).oneOf()
    nondet st = Set(true, false).oneOf()
    all { callee' = c, iter' = i, strict' = st, verdict' = reports(c, i, st) }
  }

  action init = step
}
