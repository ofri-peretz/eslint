// Model of eslint-plugin-react-features/component-api/require-data-slot (R6).
// An element that carries `data-testid` is a named part of the component and
// must also carry `data-slot`. `data-testid={undefined}` renders no attribute,
// so the element is not a named part; `data-slot={undefined}` renders none
// either, so the slot is still missing. Any other value, static or dynamic,
// is present.
// Left out: candidate for change (fires on a guess): `<div data-testid="x"
// {...rest} />`, where the spread may carry `data-slot`; and a component
// (`<Card data-testid="x" />`), which may set its own `data-slot` inside.
module require_data_slot {
  type Val = Lit | Braced | Dynamic | Undef | Absent

  pure def present(v: Val): bool = Set(Lit, Braced, Dynamic).contains(v)
  pure def reports(t: Val, sl: Val): bool = present(t) and not(present(sl))

  var testid: Val
  var slot: Val
  var verdict: bool

  action step = {
    nondet t = Set(Lit, Braced, Dynamic, Undef, Absent).oneOf()
    nondet sl = Set(Lit, Braced, Dynamic, Undef, Absent).oneOf()
    all { testid' = t, slot' = sl, verdict' = reports(t, sl) }
  }

  action init = step
}
