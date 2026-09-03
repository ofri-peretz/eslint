/**
 * SAFE - A dev socket never leaves the machine, including the bracketed IPv6
 * spelling a URL actually needs.
 */
export const dev = new WebSocket('ws://localhost:1337/hmr');
export const dev6 = new WebSocket('ws://[::1]:1337/hmr');
