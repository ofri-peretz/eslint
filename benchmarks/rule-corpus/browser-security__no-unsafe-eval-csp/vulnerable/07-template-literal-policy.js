/** VULNERABLE - a template literal so the report-uri can be interpolated. The
 *  unsafe directive sits in a static chunk; the interpolation is incidental. */
const REPORT_URI = process.env.CSP_REPORT_URI;

export const policy = `default-src 'self'; script-src 'self' 'unsafe-eval'; report-uri ${REPORT_URI}`;
