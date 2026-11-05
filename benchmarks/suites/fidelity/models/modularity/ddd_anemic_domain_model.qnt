// Model of eslint-plugin-modularity/ddd-anemic-domain-model.
// An entity whose only members are data and accessors pushes its rules into
// services. In a domain file (a path segment in `domainPaths`, default domain,
// entities, aggregates, models, ...; `[]` means every file) the rule reports a
// named class with fewer than `minBusinessMethods` (default 1) business
// methods. A business method is behaviour: a method whose body does more than
// return a field or assign one - written as a method or as an arrow-function
// class property (`withdraw = (n) => { ... }`), which is the same behaviour.
// Not business methods: the constructor, `get` / `set` accessors, a method
// that only returns `this.<field>`, a method that only assigns
// `this.<field> = <param>`. It does not report:
//   - an anonymous class (nothing to name);
//   - a class whose name ends with one of `dtoPatterns` while `ignoreDtos`
//     is true (the default): DTOs are anemic by design;
//   - a class outside the domain paths.
// Left out: methods whose kind the rule decides by NAME - a one-line `get*`
// method that computes (`getTotal() { return this.items.reduce(...) }`), a
// one-assignment `set*`-prefixed verb (`settle() { this.state = 'settled' }`),
// and a method that delegates to a member whose name contains
// repository/service/api/client/dao or to any identifier's method
// (`return Math.round(...)`): candidate for change (fires on a guess).
module ddd_anemic_domain_model {
  type Focus = Shapes | Dtos | Paths
  type Members = AccessorsOnly | GetSetMethods | FieldsOnly | OneBusiness | TwoBusiness | ArrowBusiness
  type Form = Declaration | Expression | Anonymous
  type Path = Domain | Elsewhere

  pure def businessCount(m: Members): int =
    if (m == TwoBusiness) 2 else if (Set(OneBusiness, ArrowBusiness).contains(m)) 1 else 0
  pure def reports(m: Members, min: int, f: Form, dto: bool, ignoreDtos: bool, p: Path, everywhere: bool): bool =
    f != Anonymous and not(dto and ignoreDtos) and (p == Domain or everywhere) and businessCount(m) < min

  var focus: Focus
  var members: Members
  var minBusinessMethods: int
  var form: Form
  var dtoName: bool
  var ignoreDtos: bool
  var path: Path
  var everywhere: bool
  var verdict: bool

  action step = {
    nondet fo = Set(Shapes, Dtos, Paths).oneOf()
    nondet m = (if (fo == Shapes) Set(AccessorsOnly, GetSetMethods, FieldsOnly, OneBusiness, TwoBusiness, ArrowBusiness)
                else Set(GetSetMethods, OneBusiness)).oneOf()
    nondet mn = (if (fo == Shapes) Set(1, 2) else Set(1)).oneOf()
    nondet f = (if (fo == Shapes) Set(Declaration, Expression, Anonymous) else Set(Declaration)).oneOf()
    nondet d = (if (fo == Dtos) Set(false, true) else Set(false)).oneOf()
    nondet i = (if (fo == Dtos) Set(false, true) else Set(true)).oneOf()
    nondet p = (if (fo == Paths) Set(Domain, Elsewhere) else Set(Domain)).oneOf()
    nondet e = (if (fo == Paths) Set(false, true) else Set(false)).oneOf()
    all { focus' = fo, members' = m, minBusinessMethods' = mn, form' = f, dtoName' = d,
          ignoreDtos' = i, path' = p, everywhere' = e,
          verdict' = reports(m, mn, f, d, i, p, e) }
  }

  action init = step
}
