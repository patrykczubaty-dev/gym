import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl, Alert, Linking } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { LogOut, FileText, Ticket, AlertTriangle, Bell, BellOff, ScrollText, Target, Repeat } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { useBranding } from "../../lib/branding-context";
import { theme } from "../../lib/theme";
import { brandGradient } from "../../lib/color";
import { API_BASE_URL } from "../../lib/config";
import { apiFetch, ApiError } from "../../lib/api";
import { InlineError } from "../../components/InlineError";
import type { Favorite, MeResponse } from "../../lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatWeekdayTime(iso: string): string {
  const date = new Date(iso);
  const weekday = date.toLocaleDateString("de-DE", { weekday: "short" });
  const time = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `${weekday} · ${time} Uhr`;
}

export default function ProfileScreen() {
  const { token, customer, logout } = useAuth();
  const branding = useBranding();
  const insets = useSafeAreaInsets();
  const gradientColors = useMemo(() => brandGradient(branding.primaryColor), [branding.primaryColor]);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [pushGranted, setPushGranted] = useState<boolean | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [meData, favoritesData] = await Promise.all([
        apiFetch<MeResponse>("/api/mobile/me", { token }),
        apiFetch<{ favorites: Favorite[] }>("/api/mobile/favorites", { token }),
      ]);
      setMe(meData);
      setFavorites(favoritesData.favorites);
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Profil konnte nicht geladen werden. Zieh nach unten, um es erneut zu versuchen.",
      );
    }
  }, [token]);

  const loadPushStatus = useCallback(async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPushGranted(status === "granted");
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      loadPushStatus();
    }, [load, loadPushStatus]),
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
      Alert.alert("Fehler", err instanceof ApiError ? err.message : "Kündigung fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setCancelling(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const initials = `${me?.profile.firstName?.[0] ?? customer?.firstName?.[0] ?? ""}${me?.profile.lastName?.[0] ?? customer?.lastName?.[0] ?? ""}`;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.mutedForeground} />}
    >
      {loadError && <InlineError message={loadError} />}

      <Text style={styles.screenTitle}>Profil</Text>

      <View style={styles.headerRow}>
        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </LinearGradient>
        <View>
          <Text style={styles.name}>
            {me?.profile.firstName ?? customer?.firstName} {me?.profile.lastName ?? customer?.lastName}
          </Text>
          <Text style={styles.email}>{me?.profile.email}</Text>
          {me && (
            <Text style={styles.memberSince}>
              {branding.studioName} · Mitglied seit {new Date(me.profile.joinedAt).getFullYear()}
            </Text>
          )}
        </View>
      </View>

      {me?.weeklyQuota && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Target size={16} color={branding.primaryColor} />
            <Text style={styles.cardTitle}>Wochenpensum</Text>
          </View>
          <Text style={styles.row}>
            {me.weeklyQuota.usedThisWeek} von {me.weeklyQuota.limit} Kursen diese Woche gebucht
          </Text>
        </View>
      )}

      {favorites.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Repeat size={16} color={branding.primaryColor} />
            <Text style={styles.cardTitle}>Stammkurs</Text>
          </View>
          <Text style={styles.row}>{favorites[0].courseTitle}</Text>
          <Text style={styles.rowMuted}>
            {favorites[0].nextEvent
              ? `${formatWeekdayTime(favorites[0].nextEvent.startsAt)} · ${favorites[0].nextEvent.location.city}`
              : "Kein Termin in den nächsten 2 Wochen"}
          </Text>
        </View>
      )}

      {pushGranted !== null && (
        <Pressable
          style={styles.pushCard}
          onPress={() => !pushGranted && Linking.openSettings()}
          disabled={pushGranted}
        >
          {pushGranted ? (
            <Bell size={16} color={theme.success} />
          ) : (
            <BellOff size={16} color={theme.warning} />
          )}
          <Text style={styles.pushText}>
            {pushGranted
              ? "Benachrichtigungen aktiv"
              : "Benachrichtigungen deaktiviert - du verpasst freie Wartelistenplätze. Zum Aktivieren tippen."}
          </Text>
        </Pressable>
      )}

      {me?.voucher && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ticket size={16} color={branding.primaryColor} />
            <Text style={styles.cardTitle}>Gutschein</Text>
          </View>
          <Text style={styles.row}>{me.voucher.typeLabel}</Text>
          <Text style={styles.row}>Verbleibend: {me.voucher.remainingSessions} Einheiten</Text>
          <Text style={styles.row}>Gültig bis {formatDate(me.voucher.validUntil)}</Text>
        </View>
      )}

      {me?.contract && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <FileText size={16} color={branding.primaryColor} />
            <Text style={styles.cardTitle}>Vertrag</Text>
          </View>
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
                <AlertTriangle size={15} color={theme.destructive} />
                <Text style={styles.cancelButtonText}>
                  {cancelling ? "…" : "Kündigung einreichen"}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      <Pressable style={styles.linkRow} onPress={() => Linking.openURL(`${API_BASE_URL}/impressum`)}>
        <ScrollText size={15} color={theme.mutedForeground} />
        <Text style={styles.linkText}>Impressum</Text>
      </Pressable>
      <Pressable style={styles.linkRow} onPress={() => Linking.openURL(`${API_BASE_URL}/datenschutz`)}>
        <ScrollText size={15} color={theme.mutedForeground} />
        <Text style={styles.linkText}>Datenschutzerklärung</Text>
      </Pressable>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={15} color={theme.mutedForeground} />
        <Text style={styles.logoutText}>Abmelden</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  container: { padding: 16, gap: 12 },
  screenTitle: { fontSize: 34, fontWeight: "800", color: theme.foreground, letterSpacing: -0.5 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 4 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  name: { fontSize: 19, fontWeight: "700", color: theme.foreground },
  email: { fontSize: 13, color: theme.mutedForeground, marginTop: 2 },
  memberSince: { fontSize: 12, color: theme.mutedForeground, marginTop: 2 },
  pushCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
  },
  pushText: { fontSize: 12, color: theme.foreground, flex: 1 },
  card: { borderRadius: 15, padding: 16, marginBottom: 4, backgroundColor: theme.card },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: theme.foreground },
  row: { fontSize: 13, color: theme.foreground, marginTop: 3 },
  rowMuted: { fontSize: 12, color: theme.mutedForeground, marginTop: 3 },
  badge: { backgroundColor: theme.secondary, borderRadius: 9, padding: 12, marginTop: 10 },
  badgeText: { fontSize: 13, color: theme.foreground },
  cancelButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: theme.destructive,
    borderRadius: 10.5,
    paddingVertical: 12,
    marginTop: 12,
  },
  cancelButtonText: { color: theme.destructive, fontWeight: "700", fontSize: 14 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
  linkText: { color: theme.mutedForeground, fontSize: 14 },
  logoutButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 16, marginTop: 8 },
  logoutText: { color: theme.mutedForeground, fontSize: 14 },
});
