// Model of eslint-plugin-secure-coding/no-privilege-escalation (CWE-269).
// Contract: request input (req.body / req.query) flowing into a privilege
// property (role, permission, privilege, access; exact name) or a privilege
// operation (setRole, updateRole, grantAccess; bare `grant` only as the whole
// callee name) is reported, unless a role check (hasRole, ...) guards it. A
// non-privilege property (name), a callee where `grant` is only a prefix of an
// ordinary word (grantPoints), and a constant value are not reported.
module no_privilege_escalation {
  type Op = AssignRole | AssignPermission | AssignAccess | AssignName | SetRole | Grant
          | GrantPoints | UpdateRoleMember | GrantAccess
  type Value = ReqBody | ReqQuery | Const

  pure def privileged(o: Op): bool = not(Set(AssignName, GrantPoints).contains(o))

  pure def reports(o: Op, v: Value, guarded: bool): bool =
    privileged(o) and v != Const and not(guarded)

  var op: Op
  var value: Value
  var guarded: bool
  var verdict: bool

  action step = {
    nondet o = Set(AssignRole, AssignPermission, AssignAccess, AssignName, SetRole, Grant,
                   GrantPoints, UpdateRoleMember, GrantAccess).oneOf()
    nondet v = Set(ReqBody, ReqQuery, Const).oneOf()
    nondet g = Set(true, false).oneOf()
    all { op' = o, value' = v, guarded' = g, verdict' = reports(o, v, g) }
  }

  action init = step
}
