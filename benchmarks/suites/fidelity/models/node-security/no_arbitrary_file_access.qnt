// Model of eslint-plugin-node-security/no-arbitrary-file-access (CWE-22).
// Contract (docs): the fs sink however it is reached (fs, renamed default,
// fs/promises default or named, require('fs').promises, fs.promises, destructured
// require) is reported when the path is attributable to user input: a request
// read (req.query.file), process.argv, a destructure of the request, a later
// assignment from it, or a parameter that a call site in this file fills with
// request input. Silent: literals, process.env (operator config), unattributable
// parameters, path.basename, path.join whose request parts all pass basename,
// and a startsWith containment guard. path.join with one un-basenamed request
// part still reports. A local object named fs is not the module.
module no_arbitrary_file_access {
  type Binding = FsDefault | RenamedDefaultNode | FspDefault | NamedNodePromises
               | RequirePromises | FsPromisesSub | CjsDestructureNode | LocalObject
  type PathSrc = Literal | ReqQuery | Argv | Env | Destructured | LetAssigned
               | Basename | JoinAllBasename | JoinPartial | StartsWithGuard
               | UnresolvedParam | ParamFilledInFile

  pure def userPath(p: PathSrc): bool = match p {
    | Literal => false
    | ReqQuery => true
    | Argv => true
    | Env => false
    | Destructured => true
    | LetAssigned => true
    | Basename => false
    | JoinAllBasename => false
    | JoinPartial => true
    | StartsWithGuard => false
    | UnresolvedParam => false
    | ParamFilledInFile => true
  }

  pure def reports(b: Binding, p: PathSrc): bool = b != LocalObject and userPath(p)

  var binding: Binding
  var pathSrc: PathSrc
  var verdict: bool

  action step = {
    nondet b = Set(FsDefault, RenamedDefaultNode, FspDefault, NamedNodePromises,
                   RequirePromises, FsPromisesSub, CjsDestructureNode, LocalObject).oneOf()
    nondet p = Set(Literal, ReqQuery, Argv, Env, Destructured, LetAssigned, Basename,
                   JoinAllBasename, JoinPartial, StartsWithGuard, UnresolvedParam,
                   ParamFilledInFile).oneOf()
    all { binding' = b, pathSrc' = p, verdict' = reports(b, p) }
  }

  action init = step
}
