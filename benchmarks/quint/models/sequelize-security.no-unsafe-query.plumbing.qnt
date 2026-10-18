// Model of how `sequelize-security/no-unsafe-query` finds its sink: the import
// style that loads the driver, the call syntax that reaches the method, and
// whether the receiver is the driver's or another library's object with a
// method of the same name. The verdict depends on the receiver and the value
// only: a request value in the driver's SQL text is reported however the
// driver was imported or the method called; another library's method is
// never this rule's sink.
module sequelize_security_no_unsafe_query_plumbing {
  type ImportStyle = Default | Named | Namespace | Require | Aliased
  type Call = Plain | Computed | Optional | Cast
  type Receiver = Driver | Foreign
  type Source = ReqBody | Literal
  type Position = Value | Fragment

  var importStyle: ImportStyle
  var call: Call
  var receiver: Receiver
  var source: Source
  var position: Position
  var expected: bool

  pure def shouldReport(r: Receiver, s: Source): bool = r == Driver and s == ReqBody

  action init = all {
    nondet i = Set(Default, Named, Namespace, Require, Aliased).oneOf()
    nondet c = Set(Plain, Computed, Optional, Cast).oneOf()
    nondet r = Set(Driver, Foreign).oneOf()
    nondet s = Set(ReqBody, Literal).oneOf()
    nondet p = Set(Value, Fragment).oneOf()
    all {
      importStyle' = i, call' = c, receiver' = r, source' = s, position' = p,
      expected' = shouldReport(r, s),
    }
  }

  action step = all {
    importStyle' = importStyle, call' = call, receiver' = receiver,
    source' = source, position' = position, expected' = expected,
  }
}
