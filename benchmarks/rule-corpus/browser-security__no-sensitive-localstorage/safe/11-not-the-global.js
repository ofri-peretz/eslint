/**
 * SAFE - A wrapper whose NAME contains the global's name is not the global.
 */
myLocalStorageWrapper.setItem('password', pw);
window[storageName].setItem('password', pw);
