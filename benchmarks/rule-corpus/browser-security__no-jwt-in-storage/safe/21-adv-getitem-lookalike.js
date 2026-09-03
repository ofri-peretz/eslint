/**
 * SAFE (wave 2) - A method whose name merely CONTAINS "setItem".
 */
localStorage.unsetItem('access_token');
localStorage.setItemIfAbsent('access_token', t);
