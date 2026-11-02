// Model of eslint-plugin-secure-coding/no-weak-password-recovery (CWE-640).
// Contract: a password-recovery token (a name in the recovery vocabulary:
// reset / recover / forgot / password) generated from a low-entropy source
// (Math.random, a timestamp) is reported. A CSPRNG (crypto.randomBytes,
// crypto.randomUUID, a destructured randomBytes) is secure. A token outside a
// recovery flow is not this rule's concern.
module no_weak_password_recovery {
  type Name = ResetToken | RecoveryCode | ForgotToken | Neutral
  type Gen = MathRandom | DateNow | RandomBytes | RandomUuid | DestrRandomBytes

  pure def reports(n: Name, g: Gen): bool =
    n != Neutral and Set(MathRandom, DateNow).contains(g)

  var name: Name
  var gen: Gen
  var verdict: bool

  action step = {
    nondet n = Set(ResetToken, RecoveryCode, ForgotToken, Neutral).oneOf()
    nondet g = Set(MathRandom, DateNow, RandomBytes, RandomUuid, DestrRandomBytes).oneOf()
    all { name' = n, gen' = g, verdict' = reports(n, g) }
  }

  action init = step
}
