// Model of eslint-plugin-node-security/require-storage-encryption (CWE-312).
// A filesystem write (writeFile / writeFileSync / appendFile, through fs, the
// promises API, or a named import from node:fs/promises) is reported when the
// filename or the value names a credential and the value is not wrapped in an
// encrypt call that PROVABLY encrypts (a local function returning node:crypto's
// publicEncrypt). An encrypt imported from a project module ('./vault') is
// unproven and does not count. A bare `key`, a read, and client storage are not
// this rule's.
module require_storage_encryption {
  type Fn = WriteFileSync | AppendFile | PromisesNamedWriteFile | FsPromisesMember | ReadFileSync | LocalStorageSetItem
  type Path = CredPath | PlainPath
  type Value = Token | Key | Plain | EncryptedToken | OpaqueEncryptedToken

  pure def isFsWrite(f: Fn): bool = match f {
    | ReadFileSync => false
    | LocalStorageSetItem => false
    | _ => true
  }

  pure def reports(f: Fn, p: Path, v: Value): bool =
    isFsWrite(f) and v != EncryptedToken and (p == CredPath or v == Token)

  var fn: Fn
  var path: Path
  var value: Value
  var verdict: bool

  action step = {
    nondet f = Set(WriteFileSync, AppendFile, PromisesNamedWriteFile, FsPromisesMember, ReadFileSync, LocalStorageSetItem).oneOf()
    nondet p = Set(CredPath, PlainPath).oneOf()
    nondet v = Set(Token, Key, Plain, EncryptedToken, OpaqueEncryptedToken).oneOf()
    all { fn' = f, path' = p, value' = v, verdict' = reports(f, p, v) }
  }

  action init = step
}
