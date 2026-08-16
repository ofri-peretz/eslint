/**
 * VULNERABLE - Declared with a literal, then reassigned from a request before the sink.
 */
let markup = '<p>loading</p>';
markup = await fetch('/api/html').then((r) => r.text());
el.innerHTML = markup;
