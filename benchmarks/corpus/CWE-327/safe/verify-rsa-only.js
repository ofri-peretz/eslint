// CWE-327: JWT — safe, the whitelist admits only the key's own algorithm
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST NOT fire — an RSA public key verified with RS256 alone
const jwt = require('jsonwebtoken');
const IDP_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7XEyoq2D2eUv9ZIOJuEx
Hi37MmMCijlp1kUCumwwn27BPa5mvhFgbPoNCo1Q6BLh2/mkpt1dMTVyKFCMypQ0
9rO60Af2sUL/f+P29whdK0/hEp2y73OpS/cxE3LP0ST/32r/Zb7jG7tnqRCxOCG9
0j2TOocSSjrjLM0TOYYxxWnvifWiPZ/3NXUzrF6gtnDL5u+9jpCyine6c8/CXvTz
xsAZ5i73+oWAsS1KFC7JkpObAvF5GavoNNG5xPJZ+0O+ZcFLqf7NdQb32Eem4+NA
LYyPy5nYOpMZqa0XbcantiWsgNmqKxJObKII4VP/bPd6OppaiQ/Gtx8QxROb3IHF
CwIDAQAB
-----END PUBLIC KEY-----`;
function checkToken(token) {
  return jwt.verify(token, IDP_PUBLIC_KEY, { algorithms: ['RS256'] });
}
module.exports = { checkToken };
