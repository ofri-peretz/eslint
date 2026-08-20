/**
 * VULNERABLE - ADVERSARIAL. Two `.constructor` hops off any literal reach the
 * Function constructor without the word `Function` appearing as a callee.
 */
export function compile(body) {
  return [].constructor.constructor(body);
}
