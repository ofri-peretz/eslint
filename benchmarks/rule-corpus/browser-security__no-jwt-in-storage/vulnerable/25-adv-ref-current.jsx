/**
 * VULNERABLE (wave 2) - The value read off a ref's current node.
 */
import { useRef } from 'react';

export function TokenField() {
  const input = useRef(null);

  function save() {
    window.localStorage.setItem('bearer', input.current.value);
  }

  return (
    <>
      <input ref={input} />
      <button onClick={save}>Save</button>
    </>
  );
}
