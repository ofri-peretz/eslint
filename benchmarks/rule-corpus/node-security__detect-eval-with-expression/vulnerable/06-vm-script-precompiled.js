/**
 * VULNERABLE - `new vm.Script(source)` compiles now and runs later. The
 * string→code step is identical; deferring execution does not remove it.
 */
import vm from 'node:vm';

export function buildHook(hookSource, context) {
  const script = new vm.Script(hookSource, { filename: 'hook.js' });
  return () => script.runInContext(vm.createContext(context));
}
