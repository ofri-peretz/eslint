// Model of eslint-plugin-react-a11y/alt-text (WCAG 1.1.1 Non-text Content).
// Elements whose content is an image need a text alternative:
//   - `<img>`: an `alt` (`alt=""` marks it decorative, a value the file cannot
//     see is an alt). No `alt`, or `alt={undefined}`, is a finding; so is
//     `role="presentation"` with no alt (ARIA in HTML: write `alt=""`).
//   - `<area>` and `<input type="image">`: an `alt`, as for img.
//   - `<object>`: a `title`, `aria-label`, `aria-labelledby` or text content
//     (it has no alt attribute, so these are its only names).
// On `<img>`, `aria-label` / `aria-labelledby` stand in for alt only when
// `allowAriaLabel` / `allowAriaLabelledby` (default false) say so; on area
// and input-image they always name the element (judgment: silent). `<input>` of another type, or a type the file cannot see, has no image.
// `img`, `object` (and the other) options name components to check as that
// element; an unnamed component or a member expression is silent.
// Left out: candidate for change (fires on a guess): `<img src="a.png" {...rest} />`,
// where the spread may carry `alt`.
module alt_text {
  type Case = ImgAltText | ImgAltEmpty | ImgAltDyn | ImgAltUndef | ImgNoAlt | ImgPresentation
            | ImgAriaLabel | ImgAriaLabelledby | AreaAriaLabel | AreaAriaLabelledby
            | InputAriaLabel | InputAriaLabelledby
            | ObjTitle | ObjAriaLabel | ObjAriaLabelledby | ObjText | ObjBare
            | AreaAlt | AreaNoAlt | InputImageAlt | InputImageNoAlt | InputTextNoAlt | InputDynType
            | ImageCompNoAlt | ImageCompAlt | MemberImageNoAlt | EmbedCompBare
  type Opt = Default | AllowLabel | AllowLabelledby | Named
  type Spelling = Lit | Braced | Template | Cond
  type Focus = Spellings | Labels | Elements | Comps

  pure def labelCase(c: Case): bool = Set(ImgAriaLabel, ImgAriaLabelledby).contains(c)
  pure def labelOk(c: Case, o: Opt): bool =
    (c == ImgAriaLabel and o == AllowLabel) or (c == ImgAriaLabelledby and o == AllowLabelledby)
  pure def reports(c: Case, o: Opt): bool =
    if (labelCase(c)) not(labelOk(c, o))
    else if (Set(ImageCompNoAlt, EmbedCompBare).contains(c)) o == Named
    else Set(ImgAltUndef, ImgNoAlt, ImgPresentation, ObjBare, AreaNoAlt, InputImageNoAlt).contains(c)

  var focus: Focus
  var kase: Case
  var opt: Opt
  var spelling: Spelling
  var verdict: bool

  action step = {
    nondet fo = Set(Spellings, Labels, Elements, Comps).oneOf()
    nondet c = (if (fo == Spellings) Set(ImgAltText, ImgAltEmpty)
                else if (fo == Labels) Set(ImgAriaLabel, ImgAriaLabelledby, AreaAriaLabel,
                                           AreaAriaLabelledby, InputAriaLabel, InputAriaLabelledby)
                else if (fo == Comps) Set(ImageCompNoAlt, ImageCompAlt, MemberImageNoAlt, EmbedCompBare)
                else Set(ImgAltText, ImgAltEmpty, ImgAltDyn, ImgAltUndef, ImgNoAlt, ImgPresentation,
                         ObjTitle, ObjAriaLabel, ObjAriaLabelledby, ObjText, ObjBare, AreaAlt,
                         AreaNoAlt, InputImageAlt, InputImageNoAlt, InputTextNoAlt,
                         InputDynType)).oneOf()
    nondet o = (if (fo == Labels) Set(Default, AllowLabel, AllowLabelledby)
                else if (fo == Comps) Set(Default, Named)
                else Set(Default)).oneOf()
    nondet sp = (if (fo == Spellings) Set(Lit, Braced, Template, Cond) else Set(Lit)).oneOf()
    all { focus' = fo, kase' = c, opt' = o, spelling' = sp, verdict' = reports(c, o) }
  }

  action init = step
}
