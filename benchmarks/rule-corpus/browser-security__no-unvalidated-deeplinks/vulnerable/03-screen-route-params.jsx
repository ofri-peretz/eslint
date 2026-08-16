/**
 * VULNERABLE - React Navigation parses the deep link and hands its parameters
 * to the screen. Whoever crafted `myapp://promo?next=…` chose this value.
 */
export function PromoScreen({ route }) {
  return (
    <Button
      title="Continue"
      onPress={() => Linking.openURL(route.params.next)}
    />
  );
}
