/**
 * SAFE - A hardcoded external link held in a binding. Being an Identifier is
 * not evidence; the old predicate reported exactly this as a HIGH finding.
 */
const SUPPORT_URL = 'https://help.acme-corp.io/contact';
Linking.openURL(SUPPORT_URL);
