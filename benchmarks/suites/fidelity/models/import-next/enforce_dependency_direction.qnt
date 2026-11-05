// Model of eslint-plugin-import-next/enforce-dependency-direction.
// Dependencies point inward: a layer may depend on the layers listed before
// it in `layers` (default domain, application, infrastructure, presentation),
// never on a later one. A file's layer is the `layerPatterns` directory on
// its path (default: the layers plus ui and api); a relative specifier's
// layer is that of the path it resolves to from the importing file. The rule
// reports every way a module is loaded or re-exported from a layer listed
// later than the importing file's own layer, and - with `allowSameLayer:
// false` - from the importing file's own layer.
//
// Not a finding: a file or target outside every layer directory, or in a
// directory not listed in `layers`; a package (its layer is unknown without
// resolver configuration).
module enforce_dependency_direction {
  type Focus = Spellings | Options
  type Form = Default | Namespace | Named | Renamed | TypeOnly | InlineType | SideEffect
    | ExportNamed | ExportAll | ExportAllAs | Require | Dynamic | ImportEquals
  type Layer = Domain | Application | Infrastructure | Presentation | Lib
  // `../../<layer>/x`, a file in the importing file's own folder (`./x`), a
  // package.
  type Target = ToDomain | ToApplication | ToInfrastructure | ToPresentation | ToLib
    | Local | Package
  // Defaults; allowSameLayer false; layers reversed; layerPatterns
  // ['domain', 'application'].
  type Config = Defaults | NoSameLayer | Reversed | Narrow

  pure def rank(l: Layer, c: Config): int =
    val base = if (l == Domain) 0 else if (l == Application) 1
      else if (l == Infrastructure) 2 else if (l == Presentation) 3 else -1
    if (base < 0) -1
    else if (c == Narrow and base > 1) -1
    else if (c == Reversed) 3 - base
    else base

  pure def targetLayer(src: Layer, t: Target): Layer =
    if (t == ToDomain) Domain else if (t == ToApplication) Application
    else if (t == ToInfrastructure) Infrastructure else if (t == ToPresentation) Presentation
    else if (t == Local) src else Lib

  pure def reports(src: Layer, t: Target, c: Config): bool =
    val fromRank = rank(src, c)
    val toRank = if (t == Package) -1 else rank(targetLayer(src, t), c)
    fromRank >= 0 and toRank >= 0 and (toRank > fromRank or (c == NoSameLayer and toRank == fromRank))

  var focus: Focus
  var form: Form
  var layer: Layer
  var target: Target
  var config: Config
  var verdict: bool

  action spellings = {
    nondet f = Set(Default, Namespace, Named, Renamed, TypeOnly, InlineType, SideEffect,
      ExportNamed, ExportAll, ExportAllAs, Require, Dynamic, ImportEquals).oneOf()
    all {
      focus' = Spellings, form' = f, layer' = Domain, target' = ToInfrastructure,
      config' = Defaults, verdict' = reports(Domain, ToInfrastructure, Defaults),
    }
  }

  action options = {
    nondet l = Set(Domain, Application, Infrastructure, Presentation, Lib).oneOf()
    nondet t = Set(ToDomain, ToApplication, ToInfrastructure, ToPresentation, ToLib,
      Local, Package).oneOf()
    nondet c = Set(Defaults, NoSameLayer, Reversed, Narrow).oneOf()
    all {
      focus' = Options, form' = Default, layer' = l, target' = t, config' = c,
      verdict' = reports(l, t, c),
    }
  }

  action step = any { spellings, options }
  action init = step
}
