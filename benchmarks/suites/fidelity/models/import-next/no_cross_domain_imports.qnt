// Model of eslint-plugin-import-next/no-cross-domain-imports.
// A file inside a domain directory (`<pattern>/<domain>/...`, `pattern` from
// `domainPatterns`, default domains / features / modules) must not depend on
// another domain's files. The rule resolves each relative specifier against
// the importing file and reports every way a module is loaded or re-exported
// whose target lies in a different domain - unless the target path passes
// through a shared directory (`allowedSharedModules`, default shared / common
// / utils) or a `customRules` entry whose `from` matches the importing file
// lists the target under `allowed`.
//
// Not a finding: a file outside every domain directory; a target in the same
// domain, however it is spelled (`./repo`, `../user/repo`); a target outside
// every domain (`../../shared/x`); a package (it never resolves into a domain
// directory - `ignoreNodeModules` has nothing to change).
module no_cross_domain_imports {
  type Focus = Spellings | Options
  type Form = Default | Namespace | Named | Renamed | TypeOnly | InlineType | SideEffect
    | ExportNamed | ExportAll | ExportAllAs | Require | Dynamic | ImportEquals
  // The directory holding the domains: `domains` or `contexts`.
  type Dir = Domains | Contexts
  // src/<dir>/user/handler.ts, or src/lib/user/handler.ts.
  type Source = InDomain | Outside
  type Spec = SameDir | SameDomainVia | Sibling | Full | SiblingShared | SiblingKernel
    | SiblingApi | TopShared | Package
  // Defaults; domainPatterns ['contexts']; allowedSharedModules plus
  // 'kernel'; a custom rule allowing domains/user -> domains/billing/api.
  type Config = Defaults | Patterns | SharedKernel | Custom

  pure def isDomainDir(d: Dir, c: Config): bool =
    if (c == Patterns) d == Contexts else d == Domains

  pure def reports(d: Dir, src: Source, s: Spec, c: Config): bool =
    val dd = isDomainDir(d, c)
    val inSrc = src == InDomain and dd
    // The target is in domain `billing` (else in `user`, or in no domain).
    val toBilling =
      if (s == Full) dd
      else Set(Sibling, SiblingShared, SiblingKernel, SiblingApi).contains(s) and inSrc
    val shared = s == SiblingShared or (s == SiblingKernel and c == SharedKernel)
    val customAllowed = s == SiblingApi and c == Custom
    inSrc and toBilling and not(shared) and not(customAllowed)

  var focus: Focus
  var form: Form
  var dir: Dir
  var source: Source
  var spec: Spec
  var config: Config
  var verdict: bool

  action spellings = {
    nondet f = Set(Default, Namespace, Named, Renamed, TypeOnly, InlineType, SideEffect,
      ExportNamed, ExportAll, ExportAllAs, Require, Dynamic, ImportEquals).oneOf()
    all {
      focus' = Spellings, form' = f, dir' = Domains, source' = InDomain, spec' = Sibling,
      config' = Defaults, verdict' = reports(Domains, InDomain, Sibling, Defaults),
    }
  }

  action options = {
    nondet d = Set(Domains, Contexts).oneOf()
    nondet sr = Set(InDomain, Outside).oneOf()
    nondet s = Set(SameDir, SameDomainVia, Sibling, Full, SiblingShared, SiblingKernel,
      SiblingApi, TopShared, Package).oneOf()
    nondet c = Set(Defaults, Patterns, SharedKernel, Custom).oneOf()
    all {
      focus' = Options, form' = Default, dir' = d, source' = sr, spec' = s, config' = c,
      verdict' = reports(d, sr, s, c),
    }
  }

  action step = any { spellings, options }
  action init = step
}
