// Model of eslint-plugin-react-a11y/img-redundant-alt (WCAG 1.1.1).
// Screen readers already announce an `<img>` as an image, so an alt that
// says "image", "photo" or "picture" (whole word, any case) repeats it. The
// `words` option adds words to that list (jsx-a11y contract: added to the
// defaults), `components` names components checked as img. Silent when the
// image is `aria-hidden="true"` (never announced), when alt is empty or a
// value the file cannot see, and for "photograph"/"imagery" (not the word).
// Note: this contract decides by matching words in a string, not structure;
// reported to the caller as a candidate for change.
module img_redundant_alt {
  type Alt = PhotoOf | ImageOf | PictureColon | UpperImage | Plain | Photograph | Imagery
           | Logo | Empty | Dyn
  type Spelling = Lit | Braced | Template | Cond
  type Elem = Img | ImgHidden | Image | MemberImage
  type Opt = Default | Words | Components
  type Focus = Alts | Spellings | Elems

  pure def defaultWord(a: Alt): bool = Set(PhotoOf, ImageOf, PictureColon, UpperImage).contains(a)
  pure def redundant(a: Alt, o: Opt): bool = defaultWord(a) or (a == Logo and o == Words)
  pure def checked(e: Elem, o: Opt): bool = e == Img or (e == Image and o == Components)
  pure def reports(a: Alt, e: Elem, o: Opt): bool = checked(e, o) and redundant(a, o)

  var focus: Focus
  var alt: Alt
  var spelling: Spelling
  var elem: Elem
  var opt: Opt
  var verdict: bool

  action step = {
    nondet fo = Set(Alts, Spellings, Elems).oneOf()
    nondet a = (if (fo == Spellings) Set(PhotoOf, Plain)
                else if (fo == Elems) Set(PhotoOf, Plain)
                else Set(PhotoOf, ImageOf, PictureColon, UpperImage, Plain, Photograph, Imagery,
                         Logo, Empty, Dyn)).oneOf()
    nondet sp = (if (fo == Spellings) Set(Lit, Braced, Template, Cond) else Set(Lit)).oneOf()
    nondet e = (if (fo == Elems) Set(Img, ImgHidden, Image, MemberImage) else Set(Img)).oneOf()
    nondet o = (if (fo == Spellings) Set(Default) else Set(Default, Words, Components)).oneOf()
    all { focus' = fo, alt' = a, spelling' = sp, elem' = e, opt' = o,
          verdict' = reports(a, e, o) }
  }

  action init = step
}
