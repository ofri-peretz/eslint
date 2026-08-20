/**
 * SAFE - Innocent identifiers that CONTAIN the rule's vocabulary as substrings.
 * Its default `userInputVariables` are
 * ['req','request','body','query','params','input','data'], and each of these
 * names carries one of those as a substring while holding a local constant:
 *
 *   metaDATA      -> 'data'      (a module constant)
 *   validated     -> 'data'      (a locally computed array)
 *   INPUTs        -> 'input'     (a fixed control list)
 *   bodyParts     -> 'body'      (a 3D model's fixed segments)
 *
 * Every bound below is decided in this file. A report proves the name decided.
 */
const metadata = { revision: 12 };
const bodyParts = ['head', 'torso', 'legs'];
const INPUTS = ['keyboard', 'gamepad'];

function summariseRig() {
  const out = [];
  for (let i = 0; i < bodyParts.length; i++) {
    out.push(`${bodyParts[i]}@${metadata.revision}`);
  }
  for (let j = 0; j < INPUTS.length; j++) {
    out.push(INPUTS[j]);
  }
  return out;
}

module.exports = { summariseRig };
