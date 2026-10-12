// Model of the code shapes `mcp-sdk-security/no-path-traversal-in-tool` must
// judge: a value from a client (a tool argument, a ResourceTemplate variable)
// or from the server (a constant), transformed, bound, optionally checked,
// and handed to one file API. `shouldReport` is the documented contract: a
// client value still choosing the path (joined or resolved onto a root keeps
// pointing wherever it did; `path.basename` strips every directory) reaches a
// real `fs` sink with no containment check that exits before it. A
// `startsWith(root + sep)` or `path.relative` check that throws contains it;
// `endsWith`, `existsSync` and a check that does not exit do not.
module mcp_sdk_security_no_path_traversal_in_tool {
  type Source = ToolArg | TemplateVar | ServerConst
  type Transform = NoTransform | JoinRoot | ResolveRoot | Basename
  type Guard = NoGuard | StartsWithExit | RelativeExit | EndsWithLookalike | ExistsLookalike | NonExiting
  type Sink = ReadFileNamed | ReadFileSyncDefault | PromisesNamespace | RequireWrite | FsExtra | StoreLookalike
  type Binding = Inline | ViaLet | ViaHelperSink | ViaHelperReturn

  var source: Source
  var transform: Transform
  var guard: Guard
  var sink: Sink
  var binding: Binding
  var expected: bool

  pure def fromClient(s: Source): bool = match s { | ServerConst => false | _ => true }
  pure def keepsPath(t: Transform): bool = match t { | Basename => false | _ => true }
  pure def confines(g: Guard): bool =
    match g { | StartsWithExit => true | RelativeExit => true | _ => false }
  pure def isFs(k: Sink): bool = match k { | StoreLookalike => false | _ => true }

  pure def shouldReport(s: Source, t: Transform, g: Guard, k: Sink): bool =
    fromClient(s) and keepsPath(t) and not(confines(g)) and isFs(k)

  action init = all {
    nondet s = Set(ToolArg, TemplateVar, ServerConst).oneOf()
    nondet t = Set(NoTransform, JoinRoot, ResolveRoot, Basename).oneOf()
    nondet g = Set(NoGuard, StartsWithExit, RelativeExit, EndsWithLookalike, ExistsLookalike, NonExiting).oneOf()
    nondet k = Set(ReadFileNamed, ReadFileSyncDefault, PromisesNamespace, RequireWrite, FsExtra, StoreLookalike).oneOf()
    nondet b = Set(Inline, ViaLet, ViaHelperSink, ViaHelperReturn).oneOf()
    all {
      source' = s, transform' = t, guard' = g, sink' = k, binding' = b,
      expected' = shouldReport(s, t, g, k),
    }
  }

  action step = all {
    source' = source, transform' = transform, guard' = guard, sink' = sink,
    binding' = binding, expected' = expected,
  }
}
