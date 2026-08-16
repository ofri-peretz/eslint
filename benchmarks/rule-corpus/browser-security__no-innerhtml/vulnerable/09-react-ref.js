/**
 * VULNERABLE - A ref's current node is still a DOM node.
 */
function Panel(props) {
  const box = useRef(null);
  useEffect(() => { box.current.innerHTML = props.html; }, [props.html]);
  return null;
}
