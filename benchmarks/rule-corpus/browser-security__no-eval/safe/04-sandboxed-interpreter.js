/**
 * SAFE - ADVERSARIAL. A sandboxed interpreter exposes its OWN `.eval` method.
 * It is a different API on a different object; the receiver is the evidence.
 */
import Interpreter from 'js-interpreter';

export function runSandboxed(program) {
  const interpreter = new Interpreter(program);
  return interpreter.eval();
}
