// Model of eslint-plugin-node-security/require-secure-credential-storage (CWE-312/526).
// Contract (docs): a credential written to client persistent storage
// (localStorage, sessionStorage, window.localStorage, AsyncStorage) via setItem,
// or assigned into process.env (dot or literal-bracket key), without an
// encryption call wrapping the value, is reported. Evidence of a credential is
// the key (authToken / *_TOKEN) or the value (password). Silent: non-credential
// keys (theme / PORT), `key` alone, a value wrapped in an encrypt() that
// PROVABLY encrypts (a local function returning node:crypto's publicEncrypt), a
// read of process.env, setItem on a non-persistent object, and fs writes (owned
// by require-storage-encryption). An encrypt-looking variable, base64 encoding,
// and an encrypt() whose body the file cannot see (ambient-declared) are not
// proof of encryption.
module require_secure_credential_storage {
  type Sink = LocalStorage | SessionStorage | WindowLocalStorage | AsyncStorage
            | EnvDot | EnvBracketLiteral | CacheSetItem | FsWrite | EnvRead
  type Evidence = CredKeyPlain | ThemeKey | KeyAlone | CredKeyEncrypted
                | CredKeyOpaqueEncrypt | CredKeyEncryptedVar | CredKeyBase64
                | NeutralKeyPasswordValue

  pure def isSink(s: Sink): bool = match s {
    | LocalStorage => true
    | SessionStorage => true
    | WindowLocalStorage => true
    | AsyncStorage => true
    | EnvDot => true
    | EnvBracketLiteral => true
    | CacheSetItem => false
    | FsWrite => false
    | EnvRead => false
  }

  pure def credentialUnencrypted(e: Evidence): bool = match e {
    | CredKeyPlain => true
    | ThemeKey => false
    | KeyAlone => false
    | CredKeyEncrypted => false
    | CredKeyOpaqueEncrypt => true
    | CredKeyEncryptedVar => true
    | CredKeyBase64 => true
    | NeutralKeyPasswordValue => true
  }

  pure def reports(s: Sink, e: Evidence): bool = isSink(s) and credentialUnencrypted(e)

  var sink: Sink
  var evidence: Evidence
  var verdict: bool

  action step = {
    nondet s = Set(LocalStorage, SessionStorage, WindowLocalStorage, AsyncStorage, EnvDot,
                   EnvBracketLiteral, CacheSetItem, FsWrite, EnvRead).oneOf()
    nondet e = Set(CredKeyPlain, ThemeKey, KeyAlone, CredKeyEncrypted, CredKeyOpaqueEncrypt, CredKeyEncryptedVar,
                   CredKeyBase64, NeutralKeyPasswordValue).oneOf()
    all { sink' = s, evidence' = e, verdict' = reports(s, e) }
  }

  action init = step
}
