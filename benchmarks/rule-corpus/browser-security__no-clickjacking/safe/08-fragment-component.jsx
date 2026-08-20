/** SAFE - a component that renders a fragment inside somebody else's
 *  document. It has no say in whether that document can be framed, and a rule
 *  that demands frame-busting here demands it of every component in the app. */
export function Toolbar({ items }) {
  return (
    <nav>
      {items.map((item) => (
        <button key={item.id} type="button">{item.label}</button>
      ))}
    </nav>
  );
}
