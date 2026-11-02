// Model of eslint-plugin-node-security/no-cryptojs (CWE-1104).
// Any load of the crypto-js package (root or sub-module) is reported, through
// every module-loading form: default/named import, side-effect import,
// re-export, require, dynamic import(). node:crypto and a lookalike package
// name are not.
module no_cryptojs {
  type Form = DefaultImport | NamedImport | SideEffectImport | ExportFrom | Require | DynamicImport
  type Module = CryptoJs | CryptoJsSub | NodeCrypto | Lookalike

  pure def reports(f: Form, m: Module): bool = m == CryptoJs or m == CryptoJsSub

  var form: Form
  var mod: Module
  var verdict: bool

  action step = {
    nondet f = Set(DefaultImport, NamedImport, SideEffectImport, ExportFrom, Require, DynamicImport).oneOf()
    nondet m = Set(CryptoJs, CryptoJsSub, NodeCrypto, Lookalike).oneOf()
    all { form' = f, mod' = m, verdict' = reports(f, m) }
  }

  action init = step
}
