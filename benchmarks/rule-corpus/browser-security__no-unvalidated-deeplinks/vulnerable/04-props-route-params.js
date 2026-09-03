/**
 * VULNERABLE - The same source reached through the props object rather than
 * destructured.
 */
export function onContinue(props) {
  Linking.openURL(props.route.params.redirect);
}
