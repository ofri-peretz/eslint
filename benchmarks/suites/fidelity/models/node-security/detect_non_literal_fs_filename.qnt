// Model of eslint-plugin-node-security/detect-non-literal-fs-filename (CWE-22).
// Contract (docs): the fs module is recognised through every binding spelling
// (fs, node:fs, fs/promises, node:fs/promises; default, namespace, named,
// renamed, destructured require, fs.promises, a require below its call site,
// and a bare unimported `fs`). A local object named fs is not the module.
// A taint source (default root: process) reports only when COMPOSED into a path
// (prefix concat, template with literal text, multi-arg path.join/resolve);
// used whole (or normalised whole) it is silent unless reportWholeProcessValues.
// Request roots are not default sources (no-arbitrary-file-access owns them);
// unresolved values are silent. A literal that traverses ("..") into a
// sensitive location (../../etc/passwd) is reported unless allowLiterals; a
// relative literal (../config.json) and a plain literal never are.
module detect_non_literal_fs_filename {
  type Binding = FsDefault | NsNode | NamedPromises | NamedRenamedNodePromises
               | CjsDestructureNode | PromisesSub | Bracket | RequireBelow
               | BareUnimported | LocalObject
  type PathShape = LiteralPlain | LiteralDotDot | LiteralTraversalSensitive | EnvWhole | EnvResolveWhole
                 | EnvConcat | ArgvJoin | ArgvTemplate | ReqConcat | Unresolved

  pure def reports(b: Binding, p: PathShape, wholeOpt: bool, allowLit: bool): bool =
    b != LocalObject and match p {
      | LiteralPlain => false
      | LiteralDotDot => false
      | LiteralTraversalSensitive => not(allowLit)
      | EnvWhole => wholeOpt
      | EnvResolveWhole => wholeOpt
      | EnvConcat => true
      | ArgvJoin => true
      | ArgvTemplate => true
      | ReqConcat => false
      | Unresolved => false
    }

  var binding: Binding
  var pathShape: PathShape
  var wholeOpt: bool
  var allowLit: bool
  var verdict: bool

  action step = {
    nondet b = Set(FsDefault, NsNode, NamedPromises, NamedRenamedNodePromises,
                   CjsDestructureNode, PromisesSub, Bracket, RequireBelow,
                   BareUnimported, LocalObject).oneOf()
    nondet p = Set(LiteralPlain, LiteralDotDot, LiteralTraversalSensitive, EnvWhole, EnvResolveWhole,
                   EnvConcat, ArgvJoin, ArgvTemplate, ReqConcat, Unresolved).oneOf()
    nondet w = Set(true, false).oneOf()
    nondet l = Set(true, false).oneOf()
    all {
      binding' = b, pathShape' = p, wholeOpt' = w, allowLit' = l,
      verdict' = reports(b, p, w, l),
    }
  }

  action init = step
}
