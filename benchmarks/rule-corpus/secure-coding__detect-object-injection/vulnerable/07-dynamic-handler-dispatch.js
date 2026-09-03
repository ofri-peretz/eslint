/**
 * Method injection — a command dispatcher indexed by a request field.
 *
 * `handlers` is an instance property, not a frozen literal, so the lookup can
 * reach `constructor`, `toString`, `valueOf` and everything else on
 * Object.prototype. `{"action":"constructor"}` returns the Object constructor
 * and the next line calls it. CWE-915's "method injection" arm.
 */
export class CommandBus {
  constructor(handlers) {
    this.handlers = handlers;
  }

  async dispatch(req) {
    const handler = this.handlers[req.body.action];
    return handler(req.body.payload);
  }
}
