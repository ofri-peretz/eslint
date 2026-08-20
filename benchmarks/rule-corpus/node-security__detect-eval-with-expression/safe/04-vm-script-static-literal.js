/**
 * SAFE - a precompiled Script whose source is a literal. Compiling a fixed
 * program once and running it per request is the API's intended use.
 */
import vm from 'node:vm';

const script = new vm.Script('result = input.split("").reverse().join("")');

export function reverse(input) {
  const context = vm.createContext({ input, result: '' });
  script.runInContext(context);
  return context.result;
}
