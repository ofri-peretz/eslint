/**
 * VULNERABLE - a React Native sign-in screen persists the refresh token in
 * AsyncStorage. React Native's own docs say AsyncStorage is unencrypted; on a
 * rooted or backed-up device the token is readable, and it is a long-lived
 * credential that mints new access tokens.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function signIn(api, email, password) {
  const tokens = await api.post('/oauth/token', { email, password });
  await AsyncStorage.setItem('refresh_token', tokens.refresh);
  return tokens.access;
}
