/**
 * SAFE - `alt` and `data-*` hold text, not a URL the browser fetches. An
 * attribute-blind rule reports both.
 */
export function Card() {
  return (
    <img
      src="/static/card.png"
      alt="Diagram of http://api.acme-corp.io request flow"
      data-endpoint="http://api.acme-corp.io/v1"
    />
  );
}
