// Model of eslint-plugin-jwt-security/no-hardcoded-secret (CWE-798).
// A signing / verification key written into source ships to everyone with the
// code. The key is followed within the file: a literal or template, an env
// fallback (`env || 'x'`, `env ?? 'x'`), a const, a never-reassigned let, a
// member of an object literal, the single return of a same-file function, a
// jose byte key. A reassigned let, an env var, a call, an unknown config member
// and a PEM PUBLIC key are not hardcoded secrets. Every JWT API that takes a
// key counts: jsonwebtoken sign/verify, jose SignJWT, @nestjs/jwt register and
// per-call, express-jwt, passport-jwt, fast-jwt. Test files are skipped.
module no_hardcoded_secret {
  type Spelling = Default | Namespace | Require | Named | Renamed | RequireDestructured | Bracket | NoImport
  type Sink = JsonwebtokenSign | JsonwebtokenVerify | JoseSignJwt | NestRegister | NestServiceSign | ExpressJwt | PassportStrategy | FastJwtSigner
  type Key =
    | Literal | Template | EnvOrLiteral | ConstEnvNullish | ConstLiteral | LetNeverReassigned
    | ObjectMember | FunctionReturn
    | LetReassigned | EnvVar | VaultCall | PemPublicKey | ConfigMember

  pure def hardcoded(k: Key): bool = match k {
    | Literal => true
    | Template => true
    | EnvOrLiteral => true
    | ConstEnvNullish => true
    | ConstLiteral => true
    | LetNeverReassigned => true
    | ObjectMember => true
    | FunctionReturn => true
    | LetReassigned => false
    | EnvVar => false
    | VaultCall => false
    | PemPublicKey => false
    | ConfigMember => false
  }

  pure def jsonwebtoken(s: Sink): bool = s == JsonwebtokenSign or s == JsonwebtokenVerify

  pure def reports(sp: Spelling, s: Sink, k: Key, testFile: bool): bool =
    not(testFile) and hardcoded(k) and (not(jsonwebtoken(s)) or sp != NoImport)

  var spelling: Spelling
  var sink: Sink
  var key: Key
  var testFile: bool
  var verdict: bool

  action step = {
    nondet s = Set(JsonwebtokenSign, JsonwebtokenVerify, JoseSignJwt, NestRegister, NestServiceSign, ExpressJwt, PassportStrategy, FastJwtSigner).oneOf()
    // The other sinks carry their own import; the spelling only varies jsonwebtoken.
    nondet sp = (if (jsonwebtoken(s)) Set(Default, Namespace, Require, Named, Renamed, RequireDestructured, Bracket, NoImport) else Set(Default)).oneOf()
    nondet k = Set(
      Literal, Template, EnvOrLiteral, ConstEnvNullish, ConstLiteral, LetNeverReassigned,
      ObjectMember, FunctionReturn,
      LetReassigned, EnvVar, VaultCall, PemPublicKey, ConfigMember,
    ).oneOf()
    nondet t = Set(true, false).oneOf()
    all {
      spelling' = sp,
      sink' = s,
      key' = k,
      testFile' = t,
      verdict' = reports(sp, s, k, t),
    }
  }

  action init = step
}
