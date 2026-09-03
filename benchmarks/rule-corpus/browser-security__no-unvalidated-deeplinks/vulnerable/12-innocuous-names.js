/**
 * VULNERABLE - FALSE-NEGATIVE DIRECTION. The same defect as 02 with every
 * telling identifier renamed. Detection must survive: the evidence is the
 * enclosing `Linking.addEventListener('url', …)` call site, not the spelling
 * of the parameter.
 */
Linking.addEventListener('url', (q) => {
  Linking.openURL(q.url);
});
