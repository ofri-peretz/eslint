// Model of eslint-plugin-secure-coding/detect-weak-password-validation (CWE-521).
// Contract: a length check on a password-named value whose ENFORCED minimum is
// below 8 is reported. The minimum is derived from the operator: `>= n` -> n,
// `> n` -> n+1, `=== n` -> n, and a rejecting `< n` guard -> n. So `> 7`
// (minimum 8) is not weak, `>= 8` is not, `> 5` is. A non-password name is
// outside the rule.
module detect_weak_password_validation {
  type Name = Password | Pwd | UserPassword | Passphrase | Username
  type Op = Gte | Gt | Eq | LtReject

  pure def minLen(op: Op, n: int): int = if (op == Gt) n + 1 else n

  pure def reports(name: Name, op: Op, n: int): bool =
    name != Username and minLen(op, n) < 8

  var name: Name
  var op: Op
  var n: int
  var verdict: bool

  action step = {
    nondet nm = Set(Password, Pwd, UserPassword, Passphrase, Username).oneOf()
    nondet o = Set(Gte, Gt, Eq, LtReject).oneOf()
    nondet k = Set(4, 6, 7, 8, 12).oneOf()
    all { name' = nm, op' = o, n' = k, verdict' = reports(nm, o, k) }
  }

  action init = step
}
