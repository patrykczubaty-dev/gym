import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// expo-secure-store unterstuetzt kein Web (nutzt die native iOS/Android
// Keychain) - ruft man es dort dennoch auf, crasht die App sofort ("...is
// not a function"), statt einen Fehler zu werfen der sich abfangen liesse.
// Da Expo-Projekte standardmaessig auch als Web-Build lauffaehig sind,
// faellt dieser Adapter dort auf localStorage zurueck (kein Native-Keychain-
// Schutz, aber die App bleibt zumindest benutzbar statt komplett zu crashen).
export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return globalThis.localStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
