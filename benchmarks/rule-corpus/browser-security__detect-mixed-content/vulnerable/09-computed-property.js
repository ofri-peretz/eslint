/**
 * VULNERABLE - Computed access with a static key. Same assignment, spelled so
 * that a visitor keyed on `MemberExpression.property.name` never sees it.
 */
const node = document.getElementById('hero');
node['src'] = 'http://cdn.acme-corp.io/hero.jpg';
