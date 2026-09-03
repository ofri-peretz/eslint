/**
 * SAFE - An `event.url` that is NOT a `'url'` listener payload. A click event
 * has no `url`, and deciding from the parameter's spelling would report this.
 */
button.addEventListener('click', (event) => Linking.openURL(event.url));
