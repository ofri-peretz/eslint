/**
 * VULNERABLE - The method form of an exported builder. A class exported from
 * the module hands its methods to callers this file cannot see.
 */
export class ReportClient {
  urlFor(reportName) {
    return `https://reports.example.com/v3/render?name=${reportName}`;
  }
}
