/**
 * SAFE - `preact` is one edit from `react` and is a real, widely-used package.
 * This is the shape that made the rule accuse okta/okta-signin-widget's own
 * dependency of being malware; it must stay quiet.
 */
import { h, render } from 'preact';
import { useState } from 'preact/hooks';

export function Counter({ start = 0 }) {
  const [count, setCount] = useState(start);
  return h('button', { onClick: () => setCount(count + 1) }, `clicked ${count}`);
}

export function mount(node) {
  render(h(Counter, {}), node);
}
