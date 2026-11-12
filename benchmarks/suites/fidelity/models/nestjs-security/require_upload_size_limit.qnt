// Model of eslint-plugin-nestjs-security/require-upload-size-limit (CWE-770).
// A multer upload interceptor from @nestjs/platform-express must be given a
// limits.fileSize: multer has no default for it. The limit counts when it is in
// the interceptor's own options (inline or through a const of the file) or in a
// MulterModule.register() of the project. Options the file cannot show (an
// import, a spread) are left alone. A MaxFileSizeValidator pipe is not a limit:
// it runs after the upload has been received. NoFilesInterceptor accepts no
// file, and an interceptor from another package is not multer's.
module require_upload_size_limit {
  // Test-file dimension (lib.cjs withTestFile): `allowInTests` defaults to true,
  // so a test file is exempt unless the option is turned off.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Interceptor = File | Files | FileFields | AnyFiles | NoFiles
  type Opts =
    | Absent            // FileInterceptor('file')
    | NoLimits          // { dest: './uploads' }
    | LimitsNoFileSize  // { limits: { files: 1 } }
    | InlineFileSize    // { limits: { fileSize: 1e6 } }
    | ConstFileSize     // const options = { limits: { fileSize: 1e6 } }
    | ConstNoLimit      // const options = { dest: './uploads' }
    | Imported          // import { options } from './multer.config'
    | Spread            // { ...base, dest: './uploads' }
  type Spelling = Named | Aliased | Namespace | OtherPackage
  type Project = NoModule | ModuleNoLimit | ModuleLimit

  pure def unbounded(o: Opts): bool =
    o == Absent or o == NoLimits or o == LimitsNoFileSize or o == ConstNoLimit

  pure def reports(i: Interceptor, o: Opts, sp: Spelling, p: Project, validator: bool): bool =
    i != NoFiles and sp != OtherPackage and unbounded(o) and p != ModuleLimit

  var interceptor: Interceptor
  var opts: Opts
  var spelling: Spelling
  var project: Project
  var validator: bool
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    // Every interceptor is crossed with every options shape; the import
    // spelling, the project and the validator pipe are crossed on
    // FileInterceptor with one unbounded and one bounded shape.
    nondet i = Set(File, Files, FileFields, AnyFiles, NoFiles).oneOf()
    nondet o = Set(Absent, NoLimits, LimitsNoFileSize, InlineFileSize, ConstFileSize,
                   ConstNoLimit, Imported, Spread).oneOf()
    val full = i == File and (o == Absent or o == InlineFileSize)
    nondet sp = (if (full) Set(Named, Aliased, Namespace, OtherPackage) else Set(Named)).oneOf()
    nondet p = (if (full) Set(NoModule, ModuleNoLimit, ModuleLimit) else Set(NoModule)).oneOf()
    nondet v = (if (full) Set(true, false) else Set(false)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      interceptor' = i, opts' = o, spelling' = sp, project' = p, validator' = v,
      testCtx' = tc, verdict' = (reports(i, o, sp, p, v) and not(exempt(tc))),
    }
  }

  action init = step
}
