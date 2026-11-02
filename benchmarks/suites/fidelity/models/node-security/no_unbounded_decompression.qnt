// Model of eslint-plugin-node-security/no-unbounded-decompression (CWE-409).
// A zlib buffer-at-once decompressor called without maxOutputLength is
// reported when the receiver resolves to node zlib, however it was imported
// (require, import, renamed / destructured, inline require, TS import-equals,
// dynamic import). Silent when: the options carry maxOutputLength, the options
// are opaque, the payload is a literal blob, the callee is a streaming factory
// (owned by another rule), or the name is a local helper / shadowing param.
// inflateRawSync is a buffer-at-once decompressor like the listed ones.
module no_unbounded_decompression {
  // allowInTests (default false): on a test file the rule is silent only when the
  // option is set. TestDefault = src/app.test.ts with the option at its
  // default (reported as usual), TestFlip = the same file with allowInTests: true.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestFlip
  var testCtx: TestCtx
  type Binding = RequireMember | ImportDefault | NamedImport | RenamedImport | RequireDestructured | InlineRequire | TsImportEquals | DynamicImport | LocalHelper | ShadowParam
  type Fn = GunzipSync | BrotliDecompress | InflateRawSync | CreateGunzip
  type Opts = NoOpts | WithCap | WithoutCap | Opaque

  pure def isZlib(b: Binding): bool = match b {
    | LocalHelper => false
    | ShadowParam => false
    | _ => true
  }

  pure def reports(b: Binding, f: Fn, o: Opts, literalPayload: bool): bool =
    isZlib(b) and f != CreateGunzip and not(literalPayload)
      and (o == NoOpts or o == WithoutCap)

  var binding: Binding
  var fn: Fn
  var opts: Opts
  var literalPayload: bool
  var verdict: bool

  action step = {
    nondet b = Set(RequireMember, ImportDefault, NamedImport, RenamedImport, RequireDestructured, InlineRequire, TsImportEquals, DynamicImport, LocalHelper, ShadowParam).oneOf()
    nondet f = Set(GunzipSync, BrotliDecompress, InflateRawSync, CreateGunzip).oneOf()
    nondet o = Set(NoOpts, WithCap, WithoutCap, Opaque).oneOf()
    nondet l = Set(true, false).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { binding' = b, fn' = f, opts' = o, literalPayload' = l, testCtx' = tc, verdict' = (reports(b, f, o, l) and not(exempt(tc))) }
  }

  action init = step
}
