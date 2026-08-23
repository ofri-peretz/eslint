// Provenance: ApparyllisOrg/SimplyPluralApi
// src/modules/integrations/pk/controller.ts:99,112,125 (HEAD 2026-08-22).
//
// Benign because: the host is a constant. Every PkRequest.path in that repo is a
// hardcoded `https://api.pluralkit.me/v2/...` template with an id interpolated into a
// PATH SEGMENT — the origin is never attacker-influenced, so no request can be
// redirected anywhere. Reporting SSRF here matches `axios.get(<variable>)` as a shape
// without establishing that the variable can carry a host.
const axios = require('axios');

const PK_API = 'https://api.pluralkit.me/v2';

async function getMember(memberId, token) {
  const url = `${PK_API}/members/${memberId}`;
  return axios.get(url, { headers: { authorization: token } });
}

async function listMembers(token) {
  const request = { path: `${PK_API}/systems/@me/members`, token };
  return axios.get(request.path, { headers: { authorization: request.token } });
}

module.exports = { getMember, listMembers };
