/**
 * VULNERABLE - Text the user typed, read off a resolved DOM element and
 * interpolated unencoded. The element is proven from `document.getElementById`,
 * not from the variable being called `field`.
 */
const field = document.getElementById('site-search');

export function searchUrl() {
  return `https://api.example.com/v1/search?term=${field.value}`;
}
