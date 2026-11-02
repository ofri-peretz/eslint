// Model of eslint-plugin-node-security/prefer-native-crypto (CWE-1104).
// Loading one of the listed third-party crypto libraries (or a sub-path of
// one) is reported, through import, require or dynamic import(). Native
// crypto and the recommended native bindings (bcrypt, argon2) are not.
module prefer_native_crypto {
  type Form = Import | Require | DynamicImport | Subpath
  type Module = CryptoJs | Sjcl | NodeForge | JsSha256 | AesJs | Bcryptjs | BlueimpMd5 | NodeCrypto | Bcrypt | Argon2

  pure def thirdParty(m: Module): bool = match m {
    | NodeCrypto => false
    | Bcrypt => false
    | Argon2 => false
    | _ => true
  }

  pure def reports(f: Form, m: Module): bool = thirdParty(m)

  var form: Form
  var mod: Module
  var verdict: bool

  action step = {
    nondet f = Set(Import, Require, DynamicImport, Subpath).oneOf()
    nondet m = Set(CryptoJs, Sjcl, NodeForge, JsSha256, AesJs, Bcryptjs, BlueimpMd5, NodeCrypto, Bcrypt, Argon2).oneOf()
    all { form' = f, mod' = m, verdict' = reports(f, m) }
  }

  action init = step
}
