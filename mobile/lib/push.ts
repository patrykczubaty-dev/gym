import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiFetch } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Registriert das Geraet fuer Push (nur Warteliste-Promotion, siehe Backend
// lib/push.ts) und meldet den Token ans Backend. Laeuft best-effort: ohne
// EAS-Projekt (noch nicht eingerichtet) oder im Simulator schlaegt das
// erwartungsgemaess fehl - darf den Rest der App nie blockieren.
export async function registerForPushNotifications(token: string): Promise<void> {
  if (!Device.isDevice) {
    console.log("[push] Kein physisches Geraet - ueberspringe Registrierung.");
    return;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("[push] Berechtigung verweigert.");
      return;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.log("[push] Kein EAS-Projekt konfiguriert - ueberspringe Registrierung.");
      return;
    }

    const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await apiFetch("/api/mobile/push-token", {
      method: "POST",
      token,
      body: { expoPushToken },
    });
  } catch (err) {
    console.log("[push] Registrierung fehlgeschlagen:", err);
  }
}
