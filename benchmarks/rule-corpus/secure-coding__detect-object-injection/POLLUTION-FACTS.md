# What actually pollutes a prototype — executed, not assumed

CWE-1321. Every line below was **run on Node 24**, checking `Object.prototype`
afterwards. Several results contradict what this rule currently assumes, and one
of them is the most common shape it reports.

Run it yourself: the probe is reproduced at the bottom.

---

## Pollutes

| Shape | Why |
| :--- | :--- |
| `obj['__proto__'].x = v` | writes **through** the prototype reference, so the change lands on `Object.prototype` |
| `obj.__proto__.x = v` | identical, dot form |
| `obj['constructor']['prototype'].x = v` | the other route to the same object |
| **a recursive merge over parsed input** | `merge({}, JSON.parse('{"__proto__":{"x":1}}'))` — **the real-world vector**, and the one CVEs are written about |

The common thread: **two levels.** A computed key that reaches a prototype
reference, and then a write *through* it.

## Does not pollute

| Shape | Why |
| :--- | :--- |
| `obj[k] = v` where `k === '__proto__'` | sets **that object's** prototype. Nothing else in the program is affected. |
| `Object.assign({}, JSON.parse(hostile))` | `[[Set]]` treats `__proto__` as an accessor; the payload does not propagate |
| `{ ...JSON.parse(hostile) }` | spread copies own enumerable properties only |
| **`const v = obj[k]` — every read** | a read cannot write anything, for any key, ever |
| `arr[i]` | a read, and a numeric one |
| `Object.create(null)[k] = v` | no prototype to pollute |
| `new Map().set('__proto__', v)` | `Map` keys are not properties |

---

## What this means for the rule

**Reads can never pollute.** Not with `__proto__`, not with any key. The rule
reports reads today, and no read has ever polluted a prototype in any language
runtime. This is not a heuristic judgement — it is what the probe shows.

**A single-hop write is not prototype pollution.** `obj[key] = value` with a
hostile key re-points one object's prototype. That may still be *object
injection* — an unexpected property overwritten — but it is not the weakness
CWE-1321 describes, and it is the shape this rule reports most.

**The dangerous shape is absent from what we report most.** A recursive merge
over `JSON.parse` of request data is the vector behind the real CVEs, and it is
not on the rule's must-report list.

---

## The criteria to test against

**Must report:**

1. `obj[k1][k2] = v` — a write through a computed key, two levels deep
2. `obj['__proto__'].x` / `obj.__proto__.x` / `obj.constructor.prototype.x`
3. A recursive merge / extend / deepAssign over data the program did not produce
4. `Object.setPrototypeOf(obj, attackerControlled)`
5. A `for…in` copy loop writing `target[key]` from a hostile source

**Must stay quiet:**

1. **Every read.** No exceptions.
2. `obj[k] = v`, single hop
3. `Object.assign` and spread, even over hostile JSON
4. Targets built with `Object.create(null)`, or a `Map`
5. `arr[i]` and every numeric index
6. Keys drawn from a set the program itself defines

---

## The probe

```js
const check = (label, fn) => {
  let polluted = false;
  try { fn(); polluted = {}.polluted === 'yes'; }
  catch (e) { return console.log('THREW', label); }
  console.log(polluted ? 'POLLUTES' : 'safe', label);
  delete Object.prototype.polluted;
};

check("obj['__proto__'].x", () => { const o = {}; o['__proto__'].polluted = 'yes'; });
check("obj[k] = v, k='__proto__'", () => { const o = {}, k = '__proto__'; o[k] = { polluted: 'yes' }; });
check("read obj[k]", () => { const o = {}, k = '__proto__'; const v = o[k]; return v; });
check("deep merge", () => {
  const merge = (t, s) => { for (const k in s) { if (typeof s[k] === 'object') { t[k] = t[k] || {}; merge(t[k], s[k]); } else t[k] = s[k]; } return t; };
  merge({}, JSON.parse('{"__proto__":{"polluted":"yes"}}'));
});
```

*Recorded 2026-08-19, before the read/write split of this rule's 14,696 corpus
findings was measured — so the measurement lands against a prediction rather
than the prediction being written to fit it.*
