// Model of eslint-plugin-conventions/no-json-schema-tags.
// JSON Schema keywords (`@minimum`, `@format`, ...) written as JSDoc tags fail
// strict tag validation (TSDoc, dtslint). The rule reports such a keyword in
// a JSDoc comment (`/** ... */`) where a tag stands: at the start of a line,
// or first in a one-line JSDoc. `additionalForbiddenTags` adds names
// (default none). It does not report:
//   - tags JSDoc itself defines - `@param`, and `@enum`, which JSDoc and
//     TypeScript's JSDoc support both document - even though `enum` is also
//     a JSON Schema keyword;
//   - an `@keyword` inside prose (`team@format.io`), which is not a tag;
//   - a plain block comment (`/* */`) or a line comment: no JSDoc tool reads
//     them as tags.
module no_json_schema_tags {
  type Comment = JsDoc | PlainBlock | Line
  type Position = TagLine | SameLine | InProse
  type Tag = Schema | JsdocEnum | Standard | Custom

  pure def forbidden(t: Tag, extra: bool): bool = t == Schema or (t == Custom and extra)
  pure def reports(c: Comment, p: Position, t: Tag, extra: bool): bool =
    c == JsDoc and p != InProse and forbidden(t, extra)

  var comment: Comment
  var position: Position
  var tag: Tag
  var extra: bool
  var verdict: bool

  action step = {
    nondet c = Set(JsDoc, PlainBlock, Line).oneOf()
    nondet p = Set(TagLine, SameLine, InProse).oneOf()
    nondet t = Set(Schema, JsdocEnum, Standard, Custom).oneOf()
    nondet e = Set(false, true).oneOf()
    all { comment' = c, position' = p, tag' = t, extra' = e, verdict' = reports(c, p, t, e) }
  }

  action init = step
}
