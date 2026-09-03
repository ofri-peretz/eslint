/**
 * VULNERABLE - Decoding and trimming reshape the URL without constraining who
 * controls it. Stripping the leading `#` is not a sanitiser.
 */
const raw = decodeURIComponent(window.location.hash.slice(1));
Linking.openURL(raw);
