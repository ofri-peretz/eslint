// Model of eslint-plugin-jwt-security/no-weak-secret (CWE-326).
// An HMAC secret shorter than `minSecretLength` (default 32) characters, or a
// well-known weak value ('secret', 'password', 'changeme'), can be brute-forced
// offline. The literal is followed through a const, a never-reassigned let, an
// env fallback, and jose's byte key, into jsonwebtoken, jose SignJWT and
// express-jwt. node:crypto's `signer.sign(key, 'base64')` is not a JWT signer
// ('base64' is an encoding), and test files are skipped.
module no_weak_secret {
  type Spelling = Default | Namespace | Require | Named | Renamed | RequireDestructured | Bracket | NoImport
  type Sink = Jsonwebtoken | ExpressJwt | JoseSignJwt | CryptoSignTwin
  type Secret = KnownWeak | Short8 | Medium20 | Long34
  type Form = Inline | ConstBinding | EnvFallback | LetNeverReassigned

  pure def weak(v: Secret, minLen: int): bool = match v {
    | KnownWeak => true
    | Short8 => 8 < minLen
    | Medium20 => 20 < minLen
    | Long34 => 34 < minLen
  }

  pure def reports(sp: Spelling, s: Sink, v: Secret, minLen: int, testFile: bool): bool =
    not(testFile) and match s {
      | Jsonwebtoken => sp != NoImport and weak(v, minLen)
      | ExpressJwt => weak(v, minLen)
      | JoseSignJwt => weak(v, minLen)
      | CryptoSignTwin => false
    }

  var spelling: Spelling
  var sink: Sink
  var secret: Secret
  var form: Form
  var minLen: int
  var testFile: bool
  var verdict: bool

  action step = {
    nondet s = Set(Jsonwebtoken, ExpressJwt, JoseSignJwt, CryptoSignTwin).oneOf()
    nondet sp = (if (s == Jsonwebtoken) Set(Default, Namespace, Require, Named, Renamed, RequireDestructured, Bracket, NoImport) else Set(Default)).oneOf()
    nondet v = Set(KnownWeak, Short8, Medium20, Long34).oneOf()
    nondet f = Set(Inline, ConstBinding, EnvFallback, LetNeverReassigned).oneOf()
    // 32 is the default; 16 the non-default.
    nondet m = Set(32, 16).oneOf()
    nondet t = Set(true, false).oneOf()
    all {
      spelling' = sp,
      sink' = s,
      secret' = v,
      form' = f,
      minLen' = m,
      testFile' = t,
      verdict' = reports(sp, s, v, m, t),
    }
  }

  action init = step
}
