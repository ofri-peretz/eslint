// Model of eslint-plugin-browser-security/require-mime-type-validation (CWE-434).
// A multer upload middleware reports unless its options configure a
// fileFilter. Size `limits` bound HOW MUCH is uploaded, not WHAT: CWE-434 is
// the dangerous TYPE, and the rule is named for MIME validation, so limits
// alone do not satisfy it (the doc sentence "fileFilter or strict size
// limits" was wrong and now reads "a fileFilter"). multer() with no options,
// dest or storage alone, or limits alone reports. The binding name of the
// multer import does not matter.
module require_mime_type_validation {
  type Cfg = NoArgs | DestOnly | FileFilter | LimitsOnly | Both | LimitsEmpty | StorageOnly
  type Usage = Chained | Assigned
  type Import = NoImport | Require | ImportDefault | ImportRenamed

  // The `multer` binding must be proven to be the multer package (a require or
  // import of 'multer'); a free identifier that happens to be called multer is
  // not evidence. Real code always imports it.
  pure def reports(c: Cfg, u: Usage, i: Import): bool =
    i != NoImport and match c {
      | FileFilter => false
      | Both => false
      | _ => true
    }

  var cfg: Cfg
  var usage: Usage
  var imp: Import
  var verdict: bool

  action step = {
    nondet c = Set(NoArgs, DestOnly, FileFilter, LimitsOnly, Both, LimitsEmpty, StorageOnly).oneOf()
    nondet u = Set(Chained, Assigned).oneOf()
    nondet i = Set(NoImport, Require, ImportDefault, ImportRenamed).oneOf()
    all { cfg' = c, usage' = u, imp' = i, verdict' = reports(c, u, i) }
  }

  action init = step
}
