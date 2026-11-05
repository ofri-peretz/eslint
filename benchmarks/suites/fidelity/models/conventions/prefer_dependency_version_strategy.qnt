// Model of eslint-plugin-conventions/prefer-dependency-version-strategy.
// A manifest's dependency blocks (`dependencies`, `devDependencies`,
// `peerDependencies`, `optionalDependencies`) should spell versions one way.
// `strategy` (default caret) picks it; `overrides` sets it per package, and
// applies even when the global strategy is `any`. A semver specifier is
// reported when it does not fit:
//   - caret: an exact or a tilde version;  tilde: an exact or a caret one;
//   - exact: a caret or a tilde one;
//   - range: an exact version (`^` / `~` are ranges, and `^` is what the fix
//     itself suggests);
//   - any: nothing.
// A specifier that is already an explicit range (`>=18 <19`) is left to the
// `range` strategy. `workspace:`, `file:` and `link:` versions are reported
// only when `allowWorkspace` / `allowFile` / `allowLink` is set to false
// (default true). A dist-tag (`latest`) is never reported, nor is an object
// under any other key (`versions: {...}`).
module prefer_dependency_version_strategy {
  type Version = Exact | Caret | Tilde | Range | Workspace | File | Link | Tag
  type Config = Default | TildeS | ExactS | RangeS | AnyWithOverride | OverrideAny | ProtocolsOff
  type Block = Deps | OtherKey

  pure def effective(c: Config): str =
    if (c == TildeS) "tilde"
    else if (c == ExactS or c == AnyWithOverride) "exact"
    else if (c == RangeS) "range"
    else if (c == OverrideAny) "any"
    else "caret"

  pure def misfit(v: Version, s: str): bool =
    if (s == "caret") Set(Exact, Tilde).contains(v)
    else if (s == "tilde") Set(Exact, Caret).contains(v)
    else if (s == "exact") Set(Caret, Tilde).contains(v)
    else if (s == "range") v == Exact
    else false

  pure def reports(v: Version, c: Config, b: Block): bool =
    b == Deps and (
      if (Set(Workspace, File, Link).contains(v)) c == ProtocolsOff
      else if (v == Tag) false
      else misfit(v, effective(c)))

  var version: Version
  var config: Config
  var block: Block
  var verdict: bool

  action step = {
    nondet v = Set(Exact, Caret, Tilde, Range, Workspace, File, Link, Tag).oneOf()
    nondet c = Set(Default, TildeS, ExactS, RangeS, AnyWithOverride, OverrideAny, ProtocolsOff).oneOf()
    nondet b = Set(Deps, OtherKey).oneOf()
    all { version' = v, config' = c, block' = b, verdict' = reports(v, c, b) }
  }

  action init = step
}
