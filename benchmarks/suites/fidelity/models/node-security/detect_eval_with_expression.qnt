// Model of eslint-plugin-node-security/detect-eval-with-expression (CWE-95/94).
// Contract (docs): eval / new Function with a dynamic program is reported.
// eval('literal') is always silent (nothing dynamic to inject); every other
// author-written program (new Function's literal body, one hop of single-write
// constant) is reported unless allowLiteralStrings ("false = stricter"). The vm / vm2 module sinks are reported for a dynamic program,
// resolved through the file's own import/require bindings (any spelling), and
// stay silent for a program the author wrote out, including one hop of
// single-write constant. A multi-write binding proves nothing and reports. A
// local object/class that merely shares the name is not the module.
module detect_eval_with_expression {
  type Sink = Eval | FunctionCtor | VmCjs | VmNodeDestructured | VmEsmScript
            | VmBracket | Vm2NodeVM | LocalVmObject | LocalVMClass
  type Arg = Literal | ConstHop | MultiWrite | Dynamic

  pure def authorWritten(a: Arg): bool = a == Literal or a == ConstHop

  pure def reports(s: Sink, a: Arg, allowLit: bool): bool = match s {
    | Eval => if (a == Literal) false else if (authorWritten(a)) not(allowLit) else true
    | FunctionCtor => if (authorWritten(a)) not(allowLit) else true
    | VmCjs => not(authorWritten(a))
    | VmNodeDestructured => not(authorWritten(a))
    | VmEsmScript => not(authorWritten(a))
    | VmBracket => not(authorWritten(a))
    | Vm2NodeVM => not(authorWritten(a))
    | LocalVmObject => false
    | LocalVMClass => false
  }

  var sink: Sink
  var arg: Arg
  var allowLit: bool
  var verdict: bool

  action step = {
    nondet s = Set(Eval, FunctionCtor, VmCjs, VmNodeDestructured, VmEsmScript,
                   VmBracket, Vm2NodeVM, LocalVmObject, LocalVMClass).oneOf()
    nondet a = Set(Literal, ConstHop, MultiWrite, Dynamic).oneOf()
    nondet l = Set(true, false).oneOf()
    all { sink' = s, arg' = a, allowLit' = l, verdict' = reports(s, a, l) }
  }

  action init = step
}
