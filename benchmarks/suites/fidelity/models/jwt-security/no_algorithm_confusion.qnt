// Model of eslint-plugin-jwt-security/no-algorithm-confusion (CWE-347).
// An HMAC algorithm verified against a key that is structurally public lets an
// attacker sign with the public key (CVE-2015-9235). A whitelist that mixes
// HMAC with asymmetric algorithms is that attack whatever the key is. A key is
// public only on structural evidence: createPublicKey / X509Certificate, a PEM
// PUBLIC KEY or CERTIFICATE string, a jwks-rsa key, a .pub / .crt file. Its
// name is never evidence, and neither is a .pem path.
// `symmetricAlgorithms` (default HS256/HS384/HS512) is what counts as HMAC.
module no_algorithm_confusion {
  type Spelling = Default | Require | Named | Renamed | Jose | NoImport
  type Key =
    | CreatePublicKey | X509Cert | PemPublicConst | PemCertInline
    | PubFile | CrtFile | PemFile | JwksKey
    | EnvSecret | PublicNamedSecret | NamedPublicKey
  type Algs = Hs256 | Hs384 | Rs256 | MixedRsHs256 | MixedRsHs384

  pure def publicKey(k: Key): bool = match k {
    | CreatePublicKey => true
    | X509Cert => true
    | PemPublicConst => true
    | PemCertInline => true
    | PubFile => true
    | CrtFile => true
    | PemFile => false
    | JwksKey => true
    | EnvSecret => false
    | PublicNamedSecret => false
    | NamedPublicKey => false
  }

  // narrowSym: symmetricAlgorithms: ['HS256'] instead of the default three.
  pure def hasSym(a: Algs, narrowSym: bool): bool = match a {
    | Hs256 => true
    | Hs384 => not(narrowSym)
    | Rs256 => false
    | MixedRsHs256 => true
    | MixedRsHs384 => not(narrowSym)
  }
  pure def hasAsym(a: Algs): bool = match a {
    | Hs256 => false
    | Hs384 => false
    | Rs256 => true
    | MixedRsHs256 => true
    | MixedRsHs384 => true
  }

  // jwks-rsa is itself a JWT library, so its import alone opens the file gate.
  pure def jwtFile(sp: Spelling, k: Key): bool = sp != NoImport or k == JwksKey

  pure def reports(sp: Spelling, k: Key, a: Algs, narrowSym: bool): bool =
    jwtFile(sp, k) and hasSym(a, narrowSym) and (hasAsym(a) or publicKey(k))

  var spelling: Spelling
  var key: Key
  var algs: Algs
  var narrowSym: bool
  var verdict: bool

  action step = {
    nondet sp = Set(Default, Require, Named, Renamed, Jose, NoImport).oneOf()
    nondet k = Set(
      CreatePublicKey, X509Cert, PemPublicConst, PemCertInline,
      PubFile, CrtFile, PemFile, JwksKey,
      EnvSecret, PublicNamedSecret, NamedPublicKey,
    ).oneOf()
    nondet a = Set(Hs256, Hs384, Rs256, MixedRsHs256, MixedRsHs384).oneOf()
    nondet n = Set(true, false).oneOf()
    all {
      spelling' = sp,
      key' = k,
      algs' = a,
      narrowSym' = n,
      verdict' = reports(sp, k, a, n),
    }
  }

  action init = step
}
