/**
 * VULNERABLE - Object.assign writes the same property.
 */
Object.assign(document.getElementById('out'), { innerHTML: payload });
