/**
 * VULNERABLE - ADVERSARIAL. React Navigation's own idiom reaches the deep-link
 * params through an ARRAY INDEX into the navigation state, not through a
 * destructured `route`.
 */
export function resume(state) {
  const current = state.routes[state.index];
  Linking.openURL(current.params.next);
}
