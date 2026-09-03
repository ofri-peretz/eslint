/**
 * VULNERABLE - The value comes from an array index inside a component. The key
 * is the evidence and it is a literal.
 */
export function SeedPhrase({ words }) {
  const first = words[0];
  localStorage.setItem('seed_phrase', words.join(' ') + first);
  return <p>Write these down.</p>;
}
