/**
 * SAFE - A computed read off an app config object proves nothing about the
 * value, and the app chose the config.
 */
const config = { help: 'https://help.acme-corp.io', tos: 'https://acme-corp.io/tos' };
Linking.openURL(config[key]);
