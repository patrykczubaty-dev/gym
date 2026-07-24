import { useState } from "react";
import { View, Pressable, Text, StyleSheet, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Trash2 } from "lucide-react-native";
import { theme } from "../lib/theme";
import { apiFetch, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { CancelSheet } from "./CancelSheet";
import { buildCancelConsequence } from "../lib/cancelCopy";
import type { WeeklyQuota } from "../lib/types";

function formatMeta(startsAt: string, location: string): string {
  const dateTime = new Date(startsAt).toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateTime} · ${location}`;
}

type Props = {
  status: "BOOKED" | "WAITLISTED" | null;
  bookingId: string | null;
  canCancel: boolean;
  isFull: boolean;
  // Wochenkontingent des Vertrags bereits ausgeschoepft - blockt jetzt auch
  // den Wartelisten-Beitritt (siehe /api/mobile/bookings), nicht nur die
  // direkte Buchung: wer sein Kontingent schon aufgebraucht hat, koennte
  // einen frei werdenden Platz ohnehin nicht annehmen und wuerde nur einen
  // Wartelistenplatz blockieren, den ein anderer Kunde nutzen koennte.
  // Deshalb wird quotaReached VOR isFull geprueft.
  quotaReached: boolean;
  // Fuer den Storno-Bestaetigungsdialog (CancelSheet) - zeigt konkret, was
  // das Stornieren bewirkt, statt nur "Sicher?" zu fragen.
  courseTitle: string;
  startsAt: string;
  location: string;
  weeklyQuota: WeeklyQuota;
  cancellationCutoffHours: number | null;
  gradientColors: [string, string, string];
  onBook: () => Promise<void>;
  onChange: () => Promise<void>;
};

// Buchen/Stornieren/Warteliste-verlassen an EINER Stelle statt in getrennten
// Screens (UI/UX-Feedback: kuerzester Weg zur naechsten Aktion, kein
// Tab-Wechsel mehr noetig um eine Buchung von der Kurse-Liste aus wieder
// loszuwerden). Bewusst inhaltsbreiter statt vollbreiter Button - lebt in
// derselben Zeile wie Belegungs-Badge/Teilnehmer-Chip (UI/UX-Review: weniger
// Scrollstrecke durch kompaktere Karten). Der Stornofrist-Hinweis wird vom
// aufrufenden Screen gerendert, nicht hier - sonst waere der Button nicht
// mehr zeilenkompatibel.
export function BookingAction({
  status,
  bookingId,
  canCancel,
  isFull,
  quotaReached,
  courseTitle,
  startsAt,
  location,
  weeklyQuota,
  cancellationCutoffHours,
  gradientColors,
  onBook,
  onChange,
}: Props) {
  const { token } = useAuth();
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleBook() {
    setPending(true);
    try {
      await onBook();
    } finally {
      setPending(false);
    }
  }

  async function handleCancel() {
    if (!token || !bookingId) return;
    setPending(true);
    try {
      await apiFetch(`/api/mobile/bookings/${bookingId}`, { method: "DELETE", token });
      setConfirmOpen(false);
      await onChange();
    } catch (err) {
      Alert.alert("Fehler", err instanceof ApiError ? err.message : "Stornierung fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setPending(false);
    }
  }

  // Warteliste verlassen + den jetzt freien Platz direkt buchen, statt zwei
  // getrennter manueller Schritte (Absprache) - onBook() macht die eigentliche
  // Buchung inkl. eigener Fehlermeldung, falls der Platz inzwischen doch
  // weg ist (first come, first served).
  async function handleConfirmSpot() {
    if (!token || !bookingId) return;
    setPending(true);
    try {
      await apiFetch(`/api/mobile/bookings/${bookingId}`, { method: "DELETE", token });
      await onBook();
    } catch (err) {
      Alert.alert("Fehler", err instanceof ApiError ? err.message : "Platz konnte nicht gesichert werden. Bitte versuche es erneut.");
    } finally {
      setPending(false);
      await onChange();
    }
  }

  const cancelSheet = status && (
    <CancelSheet
      visible={confirmOpen}
      title={status === "WAITLISTED" ? "Warteliste verlassen?" : `${courseTitle} stornieren?`}
      meta={formatMeta(startsAt, location)}
      consequence={buildCancelConsequence(status, weeklyQuota, cancellationCutoffHours, startsAt)}
      confirmLabel={status === "WAITLISTED" ? "Verlassen" : "Stornieren"}
      pending={pending}
      onConfirm={handleCancel}
      onDismiss={() => setConfirmOpen(false)}
    />
  );

  if (status === "BOOKED") {
    return (
      <>
        <Pressable
          style={styles.iconButtonGhost}
          onPress={() => setConfirmOpen(true)}
          disabled={pending || !canCancel}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Buchung stornieren"
        >
          <Trash2 size={18} color={canCancel ? theme.destructive : theme.mutedForeground} />
        </Pressable>
        {cancelSheet}
      </>
    );
  }

  if (status === "WAITLISTED") {
    // Ein Platz ist frei geworden (isFull ist fuer WAITLISTED sonst nie
    // relevant) - direkt ein "Platz sichern"-Button statt nur "Verlassen",
    // damit der Weg von der Push-Notification zur Buchung ein Tap ist statt
    // zwei getrennter manueller Schritte (Absprache).
    if (!isFull) {
      return (
        <>
          <View style={styles.confirmSpotRow}>
            <Pressable
              onPress={() => setConfirmOpen(true)}
              disabled={pending}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.confirmSpotDeclineText}>Verlassen</Text>
            </Pressable>
            <Pressable onPress={handleConfirmSpot} disabled={pending}>
              <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
                <Text style={styles.buttonText}>{pending ? "…" : "Platz sichern"}</Text>
              </LinearGradient>
            </Pressable>
          </View>
          {cancelSheet}
        </>
      );
    }
    return (
      <>
        <Pressable style={styles.outlineButton} onPress={() => setConfirmOpen(true)} disabled={pending}>
          <Text style={styles.outlineButtonText}>{pending ? "…" : "Warteliste verlassen"}</Text>
        </Pressable>
        {cancelSheet}
      </>
    );
  }

  // Fehlervermeidung statt Fehlerbehandlung: der Kontingent-Ring zeigt den
  // Zustand ohnehin schon an, ein aktiver "Buchen"/"Warteliste"-Button, der
  // erst nach Serverantwort mit 409 scheitert, waere widerspruechlich
  // (UI/UX-Review). Gilt jetzt auch fuer die Warteliste, siehe quotaReached
  // oben - deshalb VOR isFull geprueft.
  if (quotaReached) {
    return (
      <View style={[styles.button, styles.buttonDisabled]}>
        <Text style={[styles.buttonText, styles.buttonTextDisabled]}>Wochenlimit erreicht</Text>
      </View>
    );
  }

  if (isFull) {
    return (
      <Pressable style={[styles.button, { backgroundColor: theme.cardElevated }]} onPress={handleBook} disabled={pending}>
        <Text style={[styles.buttonText, { color: theme.foreground }]}>{pending ? "…" : "Warteliste"}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={handleBook} disabled={pending}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
        <Text style={styles.buttonText}>{pending ? "…" : "Buchen"}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 9, paddingVertical: 8, paddingHorizontal: 16, alignItems: "center" },
  buttonText: { color: theme.primaryForeground, fontWeight: "700", fontSize: 13 },
  buttonDisabled: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  buttonTextDisabled: { color: theme.mutedForeground },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: theme.destructive,
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  outlineButtonDisabled: { borderColor: theme.border },
  outlineButtonText: { color: theme.destructive, fontWeight: "700", fontSize: 13 },
  outlineButtonTextDisabled: { color: theme.mutedForeground },
  confirmSpotRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  confirmSpotDeclineText: { color: theme.mutedForeground, fontWeight: "700", fontSize: 12 },
  // Ghost statt umrandeter Box (UI/UX-Review): das Storno-Icon soll die
  // am wenigsten prominente Aktion auf der Karte sein, nicht die auffaelligste
  // - passt jetzt zur reduzierten, typografiegefuehrten Kartensprache.
  // hitSlop gleicht die fehlende sichtbare Flaeche fuer die Tap-Zielgroesse aus.
  iconButtonGhost: { padding: 4 },
});
