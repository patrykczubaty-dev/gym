import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../../lib/auth-context";
import { apiFetch, ApiError } from "../../lib/api";
import type { CourseEvent } from "../../lib/types";

const OCCUPANCY_COLOR: Record<CourseEvent["occupancy"], string> = {
  green: "#2e9f63",
  yellow: "#c98527",
  red: "#d6362b",
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CoursesScreen() {
  const { token } = useAuth();
  const [events, setEvents] = useState<CourseEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<{ events: CourseEvent[] }>("/api/mobile/courses", { token });
      setEvents(data.events);
    } catch (err) {
      Alert.alert("Fehler", err instanceof ApiError ? err.message : "Kurse konnten nicht geladen werden.");
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

  async function handleBook(event: CourseEvent) {
    if (!token) return;
    setBookingId(event.id);
    try {
      await apiFetch("/api/mobile/bookings", {
        method: "POST",
        token,
        body: { calendarEventId: event.id },
      });
      await load();
    } catch (err) {
      Alert.alert("Fehler", err instanceof ApiError ? err.message : "Buchung fehlgeschlagen.");
    } finally {
      setBookingId(null);
    }
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={events}
      keyExtractor={(e) => e.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      ListEmptyComponent={<Text style={styles.empty}>Keine Kurse in den nächsten 14 Tagen.</Text>}
      renderItem={({ item }) => {
        const isFull = item.occupancy === "red";
        const alreadyIn = item.ownBookingStatus !== null;
        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.courseTitle}>{item.course.title}</Text>
              <View style={[styles.dot, { backgroundColor: OCCUPANCY_COLOR[item.occupancy] }]} />
            </View>
            <Text style={styles.meta}>{formatDateTime(item.startsAt)} · {item.location.city}</Text>
            <Text style={styles.meta}>{item.course.trainer} · {item.bookedCount}/{item.capacity} belegt</Text>

            {alreadyIn ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.ownBookingStatus === "BOOKED"
                    ? "Du bist gebucht"
                    : `Warteliste Platz ${item.ownWaitlistPosition}`}
                </Text>
              </View>
            ) : (
              <Pressable
                style={[styles.button, isFull && styles.buttonWaitlist]}
                onPress={() => handleBook(item)}
                disabled={bookingId === item.id}
              >
                <Text style={styles.buttonText}>
                  {bookingId === item.id ? "…" : isFull ? "Auf Warteliste" : "Buchen"}
                </Text>
              </Pressable>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  empty: { textAlign: "center", color: "#6b7280", marginTop: 40 },
  card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  courseTitle: { fontSize: 16, fontWeight: "600" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  meta: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  button: { backgroundColor: "#e2483d", borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 10 },
  buttonWaitlist: { backgroundColor: "#766a62" },
  buttonText: { color: "#fff", fontWeight: "600" },
  badge: { backgroundColor: "#f1ebe6", borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 10 },
  badgeText: { color: "#241c18", fontWeight: "500", fontSize: 13 },
});
