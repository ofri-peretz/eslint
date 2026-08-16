/**
 * VULNERABLE - FALSE-NEGATIVE DIRECTION. Same defect as 02 with the telling
 * identifiers renamed. Detection must survive: the evidence is the userinfo
 * component of the URL, not the word `password` anywhere.
 */
export const settings = {
  a: 'https://u1:x9k2m@internal.acme-corp.io/api',
  b: 5000,
};
