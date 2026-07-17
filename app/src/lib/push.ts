import "server-only";

// Bewusst ein einzelner fetch() gegen Expo's Push-HTTP-API statt der
// expo-server-sdk-Bibliothek - fuer den einen Trigger, den es in v1 gibt
// (Warteliste-Promotion), ist eine zusaetzliche Abhaengigkeit nicht
// gerechtfertigt. https://docs.expo.dev/push-notifications/sending-notifications/
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function sendExpoPush(
  expoPushToken: string,
  title: string,
  body: string,
): Promise<void> {
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ to: expoPushToken, title, body, sound: "default" }),
    });
    if (!response.ok) {
      console.error(`[push] Expo-API antwortete mit HTTP ${response.status}`);
    }
  } catch (err) {
    // Push ist ein Zusatzkanal, kein kritischer Pfad - ein Fehler hier darf
    // die auslösende Aktion (z.B. Buchung stornieren) nicht scheitern lassen.
    console.error("[push] Versand fehlgeschlagen:", err);
  }
}
