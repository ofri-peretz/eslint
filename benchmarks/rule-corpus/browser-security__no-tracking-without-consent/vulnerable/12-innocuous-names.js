/**
 * VULNERABLE - FALSE-NEGATIVE DIRECTION. The same defect as 01 with every
 * telling identifier renamed. Detection must survive: the evidence is a
 * tracking sink reached with no consent branch above it.
 */
function z9() {
  analytics.track('e7');
}
z9();
