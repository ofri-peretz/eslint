/**
 * SAFE - react-native-encrypted-storage is the remediation for the AsyncStorage
 * case: it stores through the iOS Keychain and Android EncryptedSharedPreferences,
 * so the value is encrypted at rest by the platform. Its API is setItem, which
 * is the point — the method name is not what makes a store unsafe.
 */
import EncryptedStorage from 'react-native-encrypted-storage';

export async function persistRefreshToken(refreshToken) {
  await EncryptedStorage.setItem('refresh_token', refreshToken);
}
