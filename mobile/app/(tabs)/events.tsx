import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert, Pressable } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { useBranding } from "../../lib/branding-context";
import { theme } from "../../lib/theme";
import { brandGradient } from "../../lib/color";
import { apiFetch, ApiError } from "../../lib/api";
import { InlineError } from "../../components/InlineError";
import { CapacityBar } from "../../components/CapacityBar";
import { BookingAction } from "../../components/BookingAction";
import { CourseDetailSheet } from "../../components/CourseDetailSheet";
import { durationMinutes } from "../../lib/duration";
import type { EventItem, ParticipantsResponse } from "../../lib/types";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

// Enthaelt bewusst Wochentag UND Tagesdatum (nicht nur "Mo") - Events koennen
// mehr als eine Woche im Voraus liegen, ein reiner Wochentag waere dann
// mehrdeutig.
function formatDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function formatDetailMeta(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Getrennt vom Kurse-Tab, da Events (Tag der offenen Tur, Wettkampf etc.)
// konzeptionell etwas anderes sind - kein Trainer, keine Probetraining-
// Verbindung (siehe Event-Model im Backend).
export default function EventsScreen() {
  const { token } = useAuth();
  const branding = useBranding();
  const insets = useSafeAreaInsets();
  const gradientColors = useMemo(() => brandGradient(branding.primaryColor), [branding.primaryColor]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [detailFor, setDetailFor] = useState<EventItem | null>(null);
  const [detailParticipants, setDetailParticipants] = useState<ParticipantsResponse | null>(null);
  const { openEventId } = useLocalSearchParams<{ openEventId?: string }>();
  const router = useRouter();
  const handledOpenEventIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<{ events: EventItem[] }>("/api/mobile/events", { token });
      setEvents(data.events);
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Events konnten nicht geladen werden. Zieh nach unten, um es erneut zu versuchen.",
      );
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function bookEvent(eventId: string) {
    if (!token) return;
    try {
      await apiFetch("/api/mobile/bookings", { method: "POST", token, body: { calendarEventId: eventId } });
      await load();
    } catch (err) {
      Alert.alert("Fehler", err instanceof ApiError ? err.message : "Buchung fehlgeschlagen. Bitte versuche es erneut.");
    }
  }

  // Events haben keinen Trainer (siehe EventItem-Typ) - CourseDetailSheet
  // blendet die Trainer-Zelle automatisch aus, wenn trainer="" uebergeben wird.
  async function openDetail(event: EventItem) {
    setDetailFor(event);
    setDetailParticipants(null);
    if (!token) return;
    try {
      const data = await apiFetch<ParticipantsResponse>(`/api/mobile/courses/${event.id}/participants`, { token });
      setDetailParticipants(data);
    } catch (err) {
      Alert.alert(
        "Fehler",
        err instanceof ApiError ? err.message : "Teilnehmerliste konnte nicht geladen werden. Bitte versuche es erneut.",
      );
    }
  }

  // Deep Link von einer Warteliste-Push-Notification (siehe app/_layout.tsx):
  // sobald der Zieltermin geladen ist, Detail-Sheet automatisch oeffnen.
  useEffect(() => {
    if (!openEventId || handledOpenEventIdRef.current === openEventId) return;
    const match = events.find((e) => e.id === openEventId);
    if (!match) return;
    handledOpenEventIdRef.current = openEventId;
    Promise.resolve().then(() => openDetail(match));
    router.setParams({ openEventId: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openEventId, events]);

  return (
    <View style={styles.screen}>
      {loadError && <InlineError message={loadError} />}
      <FlatList
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 16 }]}
        data={events}
        keyExtractor={(e) => e.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.mutedForeground} />}
        ListHeaderComponent={<Text style={styles.screenTitle}>Events</Text>}
        ListEmptyComponent={<Text style={styles.empty}>Aktuell sind keine Events geplant.</Text>}
        renderItem={({ item }) => {
          const isFull = item.occupancy === "red";
          return (
            <View style={styles.card}>
              <Pressable
                onPress={() => openDetail(item)}
                accessibilityRole="button"
                accessibilityLabel={`Details zu ${item.title} anzeigen`}
              >
                <View style={styles.cardTopRow}>
                  <Text style={styles.timeNumber} numberOfLines={1}>{formatTime(item.startsAt)}</Text>
                  <View style={styles.cardContent}>
                    <View style={styles.titleRowInner}>
                      <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
                      <ChevronRight size={16} color={theme.mutedForeground} />
                    </View>
                    <Text style={styles.meta}>{formatDateOnly(item.startsAt)} · {item.location.city}</Text>
                  </View>
                </View>
              </Pressable>

              <View style={styles.cardBottomSection}>
                <View style={styles.capacityRow}>
                  <CapacityBar
                    bookedCount={item.bookedCount}
                    capacity={item.capacity}
                    occupancy={item.occupancy}
                    waitlistCount={item.waitlistCount}
                  />
                </View>
                <View style={styles.cardActionRow}>
                  <BookingAction
                    status={item.ownBookingStatus}
                    bookingId={item.ownBookingId}
                    canCancel={item.canCancel}
                    isFull={isFull}
                    quotaReached={false}
                    courseTitle={item.title}
                    startsAt={item.startsAt}
                    location={item.location.city}
                    weeklyQuota={null}
                    cancellationCutoffHours={item.cancellationCutoffHours}
                    gradientColors={gradientColors}
                    onBook={() => bookEvent(item.id)}
                    onChange={load}
                  />
                </View>
              </View>
            </View>
          );
        }}
      />

      <CourseDetailSheet
        visible={detailFor !== null}
        title={detailFor?.title ?? ""}
        meta={detailFor ? formatDetailMeta(detailFor.startsAt) : ""}
        trainer=""
        location={detailFor?.location.city ?? ""}
        durationMinutes={detailFor ? durationMinutes(detailFor.startsAt, detailFor.endsAt) : 0}
        description={detailFor?.description ?? null}
        participants={detailParticipants}
        onClose={() => setDetailFor(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  list: { padding: 16, gap: 12 },
  screenTitle: { fontSize: 34, fontWeight: "800", color: theme.foreground, letterSpacing: -0.5, marginBottom: 14 },
  empty: { textAlign: "center", color: theme.mutedForeground, marginTop: 40 },
  card: { borderRadius: 15, padding: 16, marginBottom: 14, backgroundColor: theme.card },
  cardTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  timeNumber: { fontSize: 22, fontWeight: "800", color: theme.foreground, width: 80, flexShrink: 0 },
  cardContent: { flex: 1, minWidth: 0 },
  titleRowInner: { flexDirection: "row", alignItems: "center", gap: 4 },
  eventTitle: { fontSize: 19, fontWeight: "800", color: theme.foreground, flexShrink: 1 },
  statusTagWrap: { alignSelf: "flex-start", marginTop: 6 },
  meta: { fontSize: 13, color: theme.mutedForeground, marginTop: 6 },
  cardBottomSection: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border },
  capacityRow: { marginBottom: 12 },
  cardActionRow: { flexDirection: "row", justifyContent: "flex-end" },
});
