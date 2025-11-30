// Test filename case conversion
function toCamelCase(str) { return str.replace(/[-_](.)/g, (_, letter) => letter.toUpperCase()); }
function toKebabCase(str) { return str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase(); }
function toPascalCase(str) { return str.charAt(0).toUpperCase() + toCamelCase(str.slice(1)); }
function toSnakeCase(str) { return str.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[\s-]+/g, '_').toLowerCase(); }

function matchesCase(str, caseType) {
  switch (caseType) {
    case 'camelCase': return str === toCamelCase(str);
    case 'kebabCase': return str === toKebabCase(str);
    case 'pascalCase': return str === toPascalCase(str);
    case 'snakeCase': return str === toSnakeCase(str);
    default: return true;
  }
}

const filename = 'myXMLHttpRequest.ts';
const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
console.log('filename:', filename);
console.log('nameWithoutExt:', nameWithoutExt);
console.log('toKebabCase(nameWithoutExt):', toKebabCase(nameWithoutExt));
console.log('matchesCase(nameWithoutExt, "kebabCase"):', matchesCase(nameWithoutExt, 'kebabCase'));
