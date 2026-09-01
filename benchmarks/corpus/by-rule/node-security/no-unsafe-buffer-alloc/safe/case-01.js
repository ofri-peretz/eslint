// node-security/no-unsafe-buffer-alloc — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by node-security/no-unsafe-buffer-alloc
function encode(value) {
         let geoBuff, pos;
         geoBuff = Buffer.allocUnsafe(9 + size);
         geoBuff.writeInt8(0x01, 0);
         geoBuff.writeInt32LE(3, 1);
         geoBuff.writeInt32LE(numRings, 5);
         pos = 9;
         for (const ring of value.coordinates) {
           geoBuff.writeInt32LE(ring.length, pos);
           pos += 4;
         }
         return geoBuff;
       }
