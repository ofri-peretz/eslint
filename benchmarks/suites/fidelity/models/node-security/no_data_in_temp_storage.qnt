// Model of eslint-plugin-node-security/no-data-in-temp-storage (CWE-312 / CWE-377).
// Contract (docs): reported when (1) the path names a temp directory on a
// segment boundary (/tmp, /var/tmp, temp/, /temp) or is a constant-named
// path.join(os.tmpdir(), '<literal>') AND (2) it is written through
// fs.writeFile / fs.writeFileSync, directly or via the const it is bound to.
// Silent: a random segment, a mkdtemp directory, a non-temp path that merely
// contains "temp" as a substring, a per-user directory, and any temp path that
// nothing writes through.
module no_data_in_temp_storage {
  // ignoreFiles (default []): a file whose path contains a listed pattern is
  // skipped. TestDefault = src/fixtures/app.ts with no patterns (reported as
  // usual), TestFlip = the same file with ignoreFiles: ['fixtures/'] (silent).
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestFlip
  var testCtx: TestCtx
  type PathKind = TmpLiteral | VarTmpViaConst | TmpdirJoinConst | TmpdirJoinRandom
                | MkdtempDir | TemplatesSubstring | HomeDir | TempRelative
  type Sink = WriteFileSync | WriteFileCb | NoWrite
  type FsImport = EsmNode | Cjs

  pure def tempPath(p: PathKind): bool = match p {
    | TmpLiteral => true
    | VarTmpViaConst => true
    | TmpdirJoinConst => true
    | TmpdirJoinRandom => false
    | MkdtempDir => false
    | TemplatesSubstring => false
    | HomeDir => false
    | TempRelative => true
  }

  pure def reports(p: PathKind, s: Sink): bool = s != NoWrite and tempPath(p)

  var pathKind: PathKind
  var sink: Sink
  var fsImport: FsImport
  var verdict: bool

  action step = {
    nondet p = Set(TmpLiteral, VarTmpViaConst, TmpdirJoinConst, TmpdirJoinRandom,
                   MkdtempDir, TemplatesSubstring, HomeDir, TempRelative).oneOf()
    nondet s = Set(WriteFileSync, WriteFileCb, NoWrite).oneOf()
    nondet i = Set(EsmNode, Cjs).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { pathKind' = p, sink' = s, fsImport' = i, testCtx' = tc, verdict' = (reports(p, s) and not(exempt(tc))) }
  }

  action init = step
}
