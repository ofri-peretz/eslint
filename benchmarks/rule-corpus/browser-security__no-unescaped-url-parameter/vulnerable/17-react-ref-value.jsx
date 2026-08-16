/**
 * VULNERABLE (wave 2) - The React spelling of a DOM read. `ref.current` is the
 * element; a DOM-element proof that only understands `document.querySelector`
 * misses the way most React code touches an input.
 */
import { useRef } from 'react';

export function SearchBox() {
  const boxRef = useRef(null);
  const go = () => fetch(`https://api.example.com/v1/s?q=${boxRef.current.value}`);
  return <button onClick={go} ref={boxRef} />;
}
