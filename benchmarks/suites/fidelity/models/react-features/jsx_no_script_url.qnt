// Model of eslint-plugin-react-features/jsx-no-script-url (CWE-79).
// A `javascript:` URL written into a URL prop (`href`, `src`, `action`,
// `formAction`, SVG's `xlink:href`) is reported, in every spelling of the
// value: a plain string, any letter case, with the tab / newline characters
// the URL parser strips (`java\tscript:`), braced, a template (with or
// without placeholders after the scheme), and as either branch of a
// conditional. A safe URL, a non-URL prop (`title`) and a dynamic value are
// not reported. A component prop is checked only when the first option names
// it (`[{ name: 'Link', props: ['to'] }]`).
// Left out: candidate for change (fires on a guess): `href` / `src` on a
// component no option names (`<Link href="javascript:...">`), whose rendered
// DOM is unknown. `includeFromSettings` reads `settings.linkComponents`,
// which the harness cannot set; it is covered by the rule's tests.
module jsx_no_script_url {
  type Focus = Values | Props | Config
  type Prop = Href | Src | Action | FormAction | XlinkHref | Title | To
  type Value = Plain | Upper | Tab | Braced | Template | TemplatePlaceholder
             | CondSame | CondOne | Safe | Dynamic
  type Cfg = NoConfig | Configured

  pure def scriptUrl(v: Value): bool = not(Set(Safe, Dynamic).contains(v))
  pure def reports(f: Focus, p: Prop, v: Value, c: Cfg): bool =
    if (f == Config) c == Configured and scriptUrl(v)
    else p != Title and scriptUrl(v)

  var focus: Focus
  var prop: Prop
  var value: Value
  var cfg: Cfg
  var verdict: bool

  action step = {
    nondet f = Set(Values, Props, Config).oneOf()
    nondet p = (if (f == Values) Set(Href)
                else if (f == Props) Set(Href, Src, Action, FormAction, XlinkHref, Title)
                else Set(To)).oneOf()
    nondet v = (if (f == Values) Set(Plain, Upper, Tab, Braced, Template, TemplatePlaceholder,
                                     CondSame, CondOne, Safe, Dynamic)
                else Set(Plain, Safe)).oneOf()
    nondet c = (if (f == Config) Set(NoConfig, Configured) else Set(NoConfig)).oneOf()
    all { focus' = f, prop' = p, value' = v, cfg' = c, verdict' = reports(f, p, v, c) }
  }

  action init = step
}
