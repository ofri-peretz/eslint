/**
 * VULNERABLE - A `.navigate()` whose target is externally chosen. The deep
 * link arrives on the fragment and is handed straight to the router.
 */
const target = document.location.hash;
navigation.navigate(target);
