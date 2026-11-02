// Model of eslint-plugin-vercel-ai-security/require-tool-confirmation (CWE-862).
// A tool whose name is destructive by whole word (delete, transfer, send,
// execute, update, drop, …) and that has an execute must carry a confirmation
// (requiresConfirmation, requiresApproval, confirm, needsApproval) or be run
// under a call-level toolApproval. `create`, `run`, `get` are not destructive.
module require_tool_confirmation {
  type Name =
    | DeleteFile | TransferFunds | SendEmail | ExecuteCommand | UpdateRecord
    | CreateChart | GetWeather | RunReport | DropdownOptions
  type Confirm =
    | NoConfirm
    | RequiresConfirmation
    | RequiresApproval
    | ConfirmTrue
    | NeedsApproval
    | NoExecute          // no execute: the client confirms
    | CallToolApproval   // toolApproval on the generateText call
  type Form = PlainObject | ToolHelper

  pure def destructive(n: Name): bool =
    n == DeleteFile or n == TransferFunds or n == SendEmail or n == ExecuteCommand or n == UpdateRecord

  pure def reports(importsAi: bool, n: Name, c: Confirm, f: Form): bool =
    importsAi and destructive(n) and c == NoConfirm

  var importsAi: bool
  var toolName: Name
  var confirm: Confirm
  var form: Form
  var verdict: bool

  action step = {
    nondet i = Set(true, false).oneOf()
    nondet n = Set(DeleteFile, TransferFunds, SendEmail, ExecuteCommand, UpdateRecord, CreateChart, GetWeather, RunReport, DropdownOptions).oneOf()
    nondet c = Set(NoConfirm, RequiresConfirmation, RequiresApproval, ConfirmTrue, NeedsApproval, NoExecute, CallToolApproval).oneOf()
    nondet f = Set(PlainObject, ToolHelper).oneOf()
    all { importsAi' = i, toolName' = n, confirm' = c, form' = f, verdict' = reports(i, n, c, f) }
  }

  action init = step
}
