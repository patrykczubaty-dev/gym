import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../../lib/auth-context";
import { apiFetch, ApiError } from "../../lib/api";
import type { Booking } from "../../lib/types";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BookingsScreen() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<{ bookings: Booking[] }>("/api/mobile/bookings", { token });
      setBookings(data.bookings);
    } catch (err) {
      Alert.alert("Fehler", err instanceof ApiError ? err.message : "Buchungen konnten nicht geladen werden.");
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

  function confirmCancel(booking: Booking) {
    Alert.alert(
      "Buchung stornieren?",
      `${booking.course?.title ?? "Termin"} am ${formatDateTime(booking.startsAt)}`,
      [
        { text: "Zurück", style: "cancel" },
        { text: "Stornieren", style: "destructive", onPress: () => handleCancel(booking.id) },
      ],
    );
  }

  async function handleCancel(id: string) {
    if (!token) return;
    setCancellingId(id);
    try {
      await apiFetch(`/api/mobile/bookings/${id}`, { method: "DELETE", token });
      await load();
    } catch (err) {
      Alert.alert("Fehler", err instanceof ApiError ? err.message : "Stornierung fehlgeschlagen.");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={bookings}
      keyExtractor={(b) => b.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      ListEmptyComponent={<Text style={styles.empty}>Du hast aktuell keine Buchungen.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.courseTitle}>{item.course?.title ?? "Termin"}</Text>
          <Text style={styles.meta}>{formatDateTime(item.startsAt)} · {item.location.city}</Text>
          <Text style={styles.meta}>
            {item.status === "BOOKED" ? "Gebucht" : `Warteliste Platz ${item.waitlistPosition}`}
          </Text>
          <Pressable
            style={styles.button}
            onPress={() => confirmCancel(item)}
            disabled={cancellingId === item.id}
          >
            <Text style={styles.buttonText}>{cancellingId === item.id ? "…" : "Stornieren"}</Text>
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  empty: { textAlign: "center", color: "#6b7280", marginTop: 40 },
  card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 14, marginBottom: 12 },
  courseTitle: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  button: {
    borderWidth: 1,
    borderColor: "#d6362b",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#d6362b", fontWeight: "600" },
});
