// Tiny YAML reader — supports the subset used in our inputs.yml:
//   - top-level scalars and nested maps
//   - inline arrays (flow style): [a, b, c]
//   - null, true, false, numbers, unquoted strings
//   - # comments, blank lines
//   - 2-space indentation only
//
// Deliberately not a general YAML parser. If inputs.yml grows complex enough to
// need anchors / multiline / block arrays, swap in `yaml` from npm.

const parseScalar = (raw) => {
  const v = raw.trim();
  if (v === '' || v === '~' || v.toLowerCase() === 'null') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  if (/^-?\d*\.\d+$/.test(v)) return parseFloat(v);
  // flow array
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map((part) => parseScalar(part));
  }
  // strip surrounding quotes
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
};

const parse = (text) => {
  const lines = text.split('\n');
  const root = {};
  // stack of [indent, container]
  const stack = [{ indent: -1, container: root }];

  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const raw = lines[lineNo];
    // strip comment (only when # is preceded by space or start-of-line, to allow # inside strings)
    const commentIdx = raw.search(/(^|\s)#/);
    const stripped = commentIdx >= 0 ? raw.slice(0, commentIdx) : raw;
    if (stripped.trim() === '') continue;

    const indent = stripped.length - stripped.trimStart().length;
    const content = stripped.trimEnd();

    // pop stack until we find the parent indent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].container;

    const keyValueMatch = content.match(/^(\s*)([^:]+):\s*(.*)$/);
    if (!keyValueMatch) continue;
    const key = keyValueMatch[2].trim();
    const valueRaw = keyValueMatch[3];

    if (valueRaw === '') {
      // map opens here
      const next = {};
      parent[key] = next;
      stack.push({ indent, container: next });
    } else {
      parent[key] = parseScalar(valueRaw);
    }
  }
  return root;
};

module.exports = { parse };
