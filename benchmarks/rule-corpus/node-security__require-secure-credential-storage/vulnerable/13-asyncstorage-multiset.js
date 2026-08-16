/**
 * VULNERABLE (adversarial) - AsyncStorage's batch API. multiSet takes an array
 * of pairs and writes exactly what setItem writes, unencrypted, to the same
 * store.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function persistSession(session) {
  await AsyncStorage.multiSet([
    ['user.id', String(session.userId)],
    ['auth.accessToken', session.accessToken],
  ]);
}
