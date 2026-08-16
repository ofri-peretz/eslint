/**
 * VULNERABLE (wave 2) - THE FALSE-NEGATIVE DIRECTION. Genuinely vulnerable code
 * with every identifier renamed to something meaningless. The KEY is the
 * evidence and it survives the rename; if detection dies here the rule was
 * reading variable names.
 */
export function Widget({ q }) {
  async function go() {
    const r = await fetch('/x');
    const d = await r.json();
    localStorage.setItem('session_id', d.v);
  }

  return <button onClick={go}>{q}</button>;
}
