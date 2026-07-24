import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { AuthProvider } from "../lib/auth-context";
import { BrandingProvider } from "../lib/branding-context";

// Deep Link bei Tap auf eine Warteliste-Push-Notification (siehe
// backend lib/push.ts / server/booking-cancellation.ts): fuehrt direkt zum
// betroffenen Termin statt nur die App zu oeffnen (Absprache).
function useWaitlistNotificationDeepLink() {
  const router = useRouter();

  useEffect(() => {
    // expo-notifications unterstuetzt Remote Push/getLastNotificationResponseAsync
    // auf Web nicht (wirft dort) - die Web-Vorschau ist ohnehin nur zum Testen
    // der reinen UI da, ein Deep Link von einer echten Push-Notification kann
    // dort nie ankommen.
    if (Platform.OS === "web") return;

    function handleResponse(response: Notifications.NotificationResponse) {
      const data = response.notification.request.content.data as
        | { calendarEventId?: string; subjectType?: "course" | "event" }
        | undefined;
      if (!data?.calendarEventId) return;
      const pathname = data.subjectType === "event" ? "/(tabs)/events" : "/(tabs)/courses";
      router.push({ pathname, params: { openEventId: data.calendarEventId } });
    }

    // Cold Start: App war komplett geschlossen und wurde erst durch den Tap
    // auf die Notification gestartet.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });

    // Warm/Background: App lief bereits im Hinter-/Vordergrund.
    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => subscription.remove();
  }, [router]);
}

export default function RootLayout() {
  useWaitlistNotificationDeepLink();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BrandingProvider>
          {/* "light" statt "auto": App-Hintergrund ist jetzt immer dunkel, die
              Statusbar-Schrift muss unabhaengig vom System-Farbschema hell
              bleiben. */}
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="verify" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </BrandingProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
