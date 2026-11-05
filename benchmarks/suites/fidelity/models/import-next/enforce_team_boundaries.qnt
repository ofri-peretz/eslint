// Model of eslint-plugin-import-next/enforce-team-boundaries.
// The user assigns paths to teams (`teams[].paths`, globs) and lists which
// other teams each may depend on (`allowedDependencies`). The rule reports
// every way a file owned by one team loads or re-exports a module owned by
// another team it may not depend on. A module's owner is decided by the path
// the specifier names: a project-rooted path (`src/auth/x`) as written, a
// relative path once resolved against the importing file. Paths matching
// `sharedPaths` belong to everyone. With `allowExternalPackages` (default
// true) a package specifier is never checked; without it, a package listed in
// a team's `paths` (`@company/auth`) belongs to that team.
//
// Not a finding: a file no team owns; a module in the same team, in an
// allowed team, in a shared path, or owned by no team.
//
// Left out (judgment): `publicPackages` - whether a team's "public" package
// is open to other teams or owned by the team is not documented.
module enforce_team_boundaries {
  type Focus = Spellings | Options
  type Form = Default | Namespace | Named | Renamed | TypeOnly | InlineType | SideEffect
    | ExportNamed | ExportAll | ExportAllAs | Require | Dynamic | ImportEquals
  // src/platform/** (may use shared), src/payments/** (may use platform and
  // shared), scripts/ (no team).
  type Source = Platform | Payments | Unowned
  // src/<team>/x/y; src/utils is a shared path; src/lib belongs to no team.
  type Target = ToPlatform | ToPayments | ToAuth | ToUtils | ToLib
  type Spelling = Rooted | Relative | Package
  type Config = AllowExternal | NoExternal

  pure def team(t: Target): int =
    if (t == ToPlatform) 1 else if (t == ToPayments) 2 else if (t == ToAuth) 3 else 0

  pure def owner(s: Source): int =
    if (s == Platform) 1 else if (s == Payments) 2 else 0

  pure def mayUse(s: Source, tm: int): bool = s == Payments and tm == 1

  pure def reports(s: Source, t: Target, sp: Spelling, c: Config): bool =
    val tm = if (sp == Package and c == AllowExternal) 0 else team(t)
    owner(s) > 0 and tm > 0 and tm != owner(s) and not(mayUse(s, tm))

  var focus: Focus
  var form: Form
  var source: Source
  var target: Target
  var spelling: Spelling
  var config: Config
  var verdict: bool

  action spellings = {
    nondet f = Set(Default, Namespace, Named, Renamed, TypeOnly, InlineType, SideEffect,
      ExportNamed, ExportAll, ExportAllAs, Require, Dynamic, ImportEquals).oneOf()
    all {
      focus' = Spellings, form' = f, source' = Platform, target' = ToAuth, spelling' = Rooted,
      config' = AllowExternal, verdict' = reports(Platform, ToAuth, Rooted, AllowExternal),
    }
  }

  action options = {
    nondet s = Set(Platform, Payments, Unowned).oneOf()
    nondet t = Set(ToPlatform, ToPayments, ToAuth, ToUtils, ToLib).oneOf()
    nondet sp = Set(Rooted, Relative, Package).oneOf()
    nondet c = Set(AllowExternal, NoExternal).oneOf()
    all {
      focus' = Options, form' = Default, source' = s, target' = t, spelling' = sp,
      config' = c, verdict' = reports(s, t, sp, c),
    }
  }

  action step = any { spellings, options }
  action init = step
}
