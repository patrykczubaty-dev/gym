import { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl, Alert } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../../lib/auth-context";
import { apiFetch, ApiError } from "../../lib/api";
import type { MeResponse } from "../../lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ProfileScreen() {
  const { token, customer, logout } = useAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<MeResponse>("/api/mobile/me", { token });
      setMe(data);
    } catch (err) {
      Alert.alert("Fehler", err instanceof ApiError ? err.message : "Profil konnte nicht geladen werden.");
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

  function confirmCancelContract() {
    if (!me?.contract) return;
    Alert.alert(
      "Vertrag kündigen?",
      `Wirksam zum ${formatDate(me.contract.cancellationEffectiveAt)}. Diese Aktion kann nicht rückgängig gemacht werden.`,
      [
        { text: "Zurück", style: "cancel" },
        { text: "Kündigung einreichen", style: "destructive", onPress: handleCancelContract },
      ],
    );
  }

  async function handleCancelContract() {
    if (!token) return;
    setCancelling(true);
    try {
      await apiFetch("/api/mobile/contract/cancel", { method: "POST", token });
      await load();
      Alert.alert("Kündigung eingereicht", "Das Studio wurde informiert.");
    } catch (err) {
      Alert.alert("Fehler", err instanceof ApiError ? err.message : "Kündigung fehlgeschlagen.");
    } finally {
      setCancelling(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Text style={styles.name}>
        {me?.profile.firstName ?? customer?.firstName} {me?.profile.lastName ?? customer?.lastName}
      </Text>
      <Text style={styles.email}>{me?.profile.email}</Text>

      {me?.voucher && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gutschein</Text>
          <Text style={styles.row}>{me.voucher.typeLabel}</Text>
          <Text style={styles.row}>Verbleibend: {me.voucher.remainingSessions} Einheiten</Text>
          <Text style={styles.row}>Gültig bis {formatDate(me.voucher.validUntil)}</Text>
        </View>
      )}

      {me?.contract && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vertrag</Text>
          <Text style={styles.row}>{me.contract.planName}</Text>
          <Text style={styles.row}>Vertragsende: {formatDate(me.contract.contractEndDate)}</Text>

          {me.contract.cancellationReceivedAt ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                Gekündigt · wirksam zum {formatDate(me.contract.cancellationEffectiveAt)}
                {me.contract.autoRenewed ? " (nach automatischer Verlängerung)" : ""}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.row}>
                Kündigung möglich bis {formatDate(me.contract.cancellationPossibleUntil)}
              </Text>
              <Pressable
                style={styles.cancelButton}
                onPress={confirmCancelContract}
                disabled={cancelling}
              >
                <Text style={styles.cancelButtonText}>
                  {cancelling ? "…" : "Kündigung einreichen"}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Abmelden</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  name: { fontSize: 20, fontWeight: "700" },
  email: { fontSize: 13, color: "#6b7280", marginBottom: 12 },
  card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: "600", marginBottom: 6 },
  row: { fontSize: 13, color: "#374151", marginTop: 2 },
  badge: { backgroundColor: "#f1ebe6", borderRadius: 8, padding: 10, marginTop: 8 },
  badgeText: { fontSize: 13, color: "#241c18" },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#d6362b",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 10,
  },
  cancelButtonText: { color: "#d6362b", fontWeight: "600" },
  logoutButton: { alignItems: "center", paddingVertical: 16 },
  logoutText: { color: "#6b7280", fontSize: 14 },
});
