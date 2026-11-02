// Model of eslint-plugin-node-security/no-zip-slip (CWE-22).
// Contract (docs): in a file that works with archives (an archiveModules import,
// ESM or CJS), extracting without validation (adm-zip extractAllTo, tar.extract)
// and writing to path.join(dest, entry.<name>) are reported. Resolve +
// startsWith containment check with early exit, the path.relative spelling, and
// a pathValidationFunctions call clear it; a join in the branch where the check
// FAILED still reports. A safe library and an `// @safe` comment on the
// statement are silent. With no archive context (no archiveModules import) the
// file is not extracting anything: extract-named calls are silent, and the
// entry-name / traversal shapes are silent unless reportWithoutArchiveContext
// (which the option documents as restoring exactly those shapes).
module no_zip_slip {
  type Shape = ExtractAllTo | TarExtract | EntryJoin | EntryResolveChecked
             | EntryRelativeChecked | EntryFailedBranch | EntryValidateFn
             | SafeComment | SafeLib
  type Import = EsmImport | CjsRequire | NoArchiveImport

  pure def unsafeShape(s: Shape): bool = match s {
    | ExtractAllTo => true
    | TarExtract => true
    | EntryJoin => true
    | EntryResolveChecked => false
    | EntryRelativeChecked => false
    | EntryFailedBranch => true
    | EntryValidateFn => false
    | SafeComment => false
    | SafeLib => false
  }

  pure def extractionCall(s: Shape): bool = s == ExtractAllTo or s == TarExtract

  pure def reports(s: Shape, i: Import, withoutCtx: bool): bool =
    unsafeShape(s) and (i != NoArchiveImport or (withoutCtx and not(extractionCall(s))))

  var shape: Shape
  var imp: Import
  var withoutCtx: bool
  var verdict: bool

  action step = {
    nondet s = Set(ExtractAllTo, TarExtract, EntryJoin, EntryResolveChecked,
                   EntryRelativeChecked, EntryFailedBranch, EntryValidateFn,
                   SafeComment, SafeLib).oneOf()
    nondet i = Set(EsmImport, CjsRequire, NoArchiveImport).oneOf()
    nondet w = Set(true, false).oneOf()
    all { shape' = s, imp' = i, withoutCtx' = w, verdict' = reports(s, i, w) }
  }

  action init = step
}
