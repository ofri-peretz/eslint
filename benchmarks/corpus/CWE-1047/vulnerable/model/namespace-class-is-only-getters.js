// CWE-1047: vulnerable — a domain class holding two fields whose entire public surface is a constructor and two getters — no behaviour lives with the data
// @author        (not ours — see @source)
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-09-01
// @source        Ontotext-AD/graphdb.js@988c5b630cc340c311115cc8132fa723ff680caa src/model/namespace.js:1
// @expected      vulnerable
// This MUST be flagged
/**
 * Class for containing a namespace and it's associated prefix.
 *
 * @author Mihail Radkov
 * @author Svilen Velikov
 */
class Namespace {
  /**
   * Instantiates a namespace with its prefix.
   *
   * @param {string} prefix the namespace prefix
   * @param {NamedNode} namespace the namespace as named node
   */
  constructor(prefix, namespace) {
    this.prefix = prefix;
    this.namespace = namespace;
  }

  /**
   * Returns the namespace prefix.
   *
   * @return {string} the namespace prefix
   */
  getPrefix() {
    return this.prefix;
  }

  /**
   * Returns the namespace.
   *
   * @return {NamedNode} the namespace as named node
   */
  getNamespace() {
    return this.namespace;
  }
}

module.exports = Namespace;
