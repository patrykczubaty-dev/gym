import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl, Alert } from "react-native";
import { useFocusEffect, Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Repeat, ChevronRight } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { useBranding } from "../../lib/branding-context";
import { theme } from "../../lib/theme";
import { brandGradient } from "../../lib/color";
import { apiFetch, ApiError } from "../../lib/api";
import { InlineError } from "../../components/InlineError";
import { BookingAction } from "../../components/BookingAction";
import { CapacityBar } from "../../components/CapacityBar";
import { CourseDetailSheet } from "../../components/CourseDetailSheet";
import { durationMinutes } from "../../lib/duration";
import type { Favorite, ParticipantsResponse, StatsResponse } from "../../lib/types";

const CHART_HEIGHT = 90;

function formatVisitDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function formatDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type DetailTarget = {
  eventId: string;
  title: string;
  meta: string;
  trainer: string;
  location: string;
  durationMinutes: number;
  description: string | null;
};

export default function StatsScreen() {
  const { token } = useAuth();
  const branding = useBranding();
  const insets = useSafeAreaInsets();
  const gradientColors = useMemo(() => brandGradient(branding.primaryColor), [branding.primaryColor]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);
  const [detailParticipants, setDetailParticipants] = useState<ParticipantsResponse | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [statsData, favoritesData] = await Promise.all([
        apiFetch<StatsResponse>("/api/mobile/stats", { token }),
        apiFetch<{ favorites: Favorite[] }>("/api/mobile/favorites", { token }),
      ]);
      setStats(statsData);
      setFavorites(favoritesData.favorites);
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "Statistik konnte nicht geladen werden. Zieh nach unten, um es erneut zu versuchen.",
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

  async function bookFavorite(calendarEventId: string) {
    if (!token) return;
    try {
      await apiFetch("/api/mobile/bookings", { method: "POST", token, body: { calendarEventId } });
      await load();
    } catch (err) {
      Alert.alert("Fehler", err instanceof ApiError ? err.message : "Buchung fehlgeschlagen. Bitte versuche es erneut.");
    }
  }

  async function openDetail(target: DetailTarget) {
    setDetailTarget(target);
    setDetailParticipants(null);
    if (!token) return;
    try {
      const data = await apiFetch<ParticipantsResponse>(`/api/mobile/courses/${target.eventId}/participants`, { token });
      setDetailParticipants(data);
    } catch (err) {
      Alert.alert(
        "Fehler",
        err instanceof ApiError ? err.message : "Teilnehmerliste konnte nicht geladen werden. Bitte versuche es erneut.",
      );
    }
  }

  const maxCount = stats?.byCourse[0]?.count ?? 1;
  const maxWeeklyCount = Math.max(1, ...(stats?.weeklyBreakdown.map((w) => w.count) ?? [1]));
  const favoriteCourse = stats?.byCourse[0]?.courseTitle ?? "–";

  return (
    <View style={styles.screen}>
      {loadError && <InlineError message={loadError} />}
      <ScrollView
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 16 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.mutedForeground} />}
      >
        {stats ? (
          <>
            <Text style={styles.screenTitle}>Statistik</Text>

            <View style={styles.kpiRow}>
              <View style={styles.kpiCell}>
                <Text style={styles.kpiValue}>{stats.totalBookings}</Text>
                <Text style={styles.kpiLabel}>Kurse insgesamt</Text>
              </View>
              <View style={[styles.kpiCell, styles.kpiCellDivider]}>
                <Text style={styles.kpiValue}>{stats.monthlyCount}</Text>
                <Text style={styles.kpiLabel}>Kurse im Monat</Text>
              </View>
              <View style={styles.kpiCell}>
                <Text style={[styles.kpiValue, styles.kpiValueAccent]} numberOfLines={1}>
                  {favoriteCourse}
                </Text>
                <Text style={styles.kpiLabel}>Lieblingskurs</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Kurse pro Woche</Text>
            <View style={styles.chartCard}>
              <View style={styles.chartRow}>
                {stats.weeklyBreakdown.map((week, i) => {
                  const isCurrent = i === stats.weeklyBreakdown.length - 1;
                  const barHeight = Math.max(4, (week.count / maxWeeklyCount) * CHART_HEIGHT);
                  return (
                    <View key={week.weekLabel} style={styles.chartColumn}>
                      <View style={styles.chartBarTrack}>
                        <View
                          style={[
                            styles.chartBarFill,
                            { height: barHeight, backgroundColor: isCurrent ? theme.foreground : theme.mutedForeground },
                          ]}
                        />
                      </View>
                      <Text style={[styles.chartLabel, isCurrent && { color: theme.foreground, fontWeight: "800" }]}>
                        {week.weekLabel.replace("KW ", "")}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {stats.byCourse.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Nach Kurs</Text>
                {stats.byCourse.map((item) => (
                  <View key={item.courseTitle} style={styles.row}>
                    <View style={styles.rowHeader}>
                      <Text style={styles.courseTitle}>{item.courseTitle}</Text>
                      <Text style={styles.count}>{item.count}x</Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${(item.count / maxCount) * 100}%`, backgroundColor: theme.mutedForeground }]} />
                    </View>
                  </View>
                ))}
              </>
            )}

            {stats.recentVisits.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Bereits besucht</Text>
                <View style={styles.historyCard}>
                  {stats.recentVisits.map((visit, i) => (
                    <View
                      key={`${visit.startsAt}-${i}`}
                      style={[styles.historyRow, i === stats.recentVisits.length - 1 && styles.historyRowLast]}
                    >
                      <Text style={styles.historyDate}>{formatVisitDate(visit.startsAt)}</Text>
                      <Text style={styles.historyTitle} numberOfLines={1}>{visit.courseTitle}</Text>
                      <Text style={styles.historyLocation}>{visit.location}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {stats.byCourse.length === 0 && stats.recentVisits.length === 0 && (
              <Text style={styles.empty}>Noch keine Buchungen - hier siehst du bald, wie oft du welchen Kurs besuchst.</Text>
            )}

            <Text style={styles.sectionTitle}>Deine Stammkurse</Text>
            {favorites.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.empty}>
                  Noch keine Stammkurse — deine meistgebuchten Kurse erscheinen hier automatisch, sobald du denselben
                  Kurs ein paar Mal gebucht hast.
                </Text>
                <Link href="/courses" asChild>
                  <Pressable style={[styles.emptyLink, styles.emptyLinkRow]}>
                    <Text style={styles.emptyLinkText}>Kurse ansehen</Text>
                    <ChevronRight size={14} color={theme.foreground} />
                  </Pressable>
                </Link>
              </View>
            ) : (
              favorites.map((fav) => (
                <View key={fav.courseId} style={styles.favoriteCard}>
                  <Pressable
                    disabled={!fav.nextEvent}
                    onPress={() =>
                      fav.nextEvent &&
                      openDetail({
                        eventId: fav.nextEvent.id,
                        title: fav.courseTitle,
                        meta: formatDateTime(fav.nextEvent.startsAt),
                        trainer: fav.nextEvent.trainer,
                        location: fav.nextEvent.location.city,
                        durationMinutes: durationMinutes(fav.nextEvent.startsAt, fav.nextEvent.endsAt),
                        description: fav.nextEvent.description,
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Details zu ${fav.courseTitle} anzeigen`}
                  >
                    <View style={styles.cardTopRow}>
                      {fav.nextEvent ? (
                        <Text style={styles.timeNumber} numberOfLines={1}>{formatTime(fav.nextEvent.startsAt)}</Text>
                      ) : (
                        <View style={[styles.iconCircle, { backgroundColor: theme.secondary }]}>
                          <Repeat size={18} color={theme.mutedForeground} />
                        </View>
                      )}
                      <View style={styles.cardContent}>
                        <View style={styles.titleRowInner}>
                          <Text style={styles.favoriteCourseTitle} numberOfLines={1}>{fav.courseTitle}</Text>
                          {fav.nextEvent && <ChevronRight size={16} color={theme.mutedForeground} />}
                        </View>
                        <Text style={styles.meta}>
                          {fav.nextEvent
                            ? `${formatDateOnly(fav.nextEvent.startsAt)} · ${fav.nextEvent.location.city}`
                            : "Kein Termin in den nächsten 2 Wochen"}
                        </Text>
                      </View>
                    </View>
                  </Pressable>

                  {fav.nextEvent && (
                    <View style={styles.cardBottomSection}>
                      <View style={styles.capacityRow}>
                        <CapacityBar
                          bookedCount={fav.nextEvent.bookedCount}
                          capacity={fav.nextEvent.capacity}
                          occupancy={fav.nextEvent.occupancy}
                          waitlistCount={fav.nextEvent.waitlistCount}
                        />
                      </View>
                      <View style={styles.cardActionRow}>
                        <BookingAction
                          status={fav.nextEvent.ownBookingStatus}
                          bookingId={fav.nextEvent.ownBookingId}
                          canCancel={fav.nextEvent.canCancel}
                          isFull={fav.nextEvent.isFull}
                          quotaReached={
                            fav.nextEvent.weeklyQuota !== null &&
                            fav.nextEvent.weeklyQuota.usedThisWeek >= fav.nextEvent.weeklyQuota.limit
                          }
                          courseTitle={fav.courseTitle}
                          startsAt={fav.nextEvent.startsAt}
                          location={fav.nextEvent.location.city}
                          weeklyQuota={fav.nextEvent.weeklyQuota}
                          cancellationCutoffHours={fav.nextEvent.cancellationCutoffHours}
                          gradientColors={gradientColors}
                          onBook={() => bookFavorite(fav.nextEvent!.id)}
                          onChange={load}
                        />
                      </View>
                    </View>
                  )}
                </View>
              ))
            )}
          </>
        ) : (
          <Text style={styles.empty}>Noch keine Buchungen - hier siehst du bald, wie oft du welchen Kurs besuchst.</Text>
        )}
      </ScrollView>

      <CourseDetailSheet
        visible={detailTarget !== null}
        title={detailTarget?.title ?? ""}
        meta={detailTarget?.meta ?? ""}
        trainer={detailTarget?.trainer ?? ""}
        location={detailTarget?.location ?? ""}
        durationMinutes={detailTarget?.durationMinutes ?? 0}
        description={detailTarget?.description ?? null}
        participants={detailParticipants}
        onClose={() => setDetailTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  list: { padding: 16, gap: 10 },
  empty: { textAlign: "center", color: theme.mutedForeground, marginTop: 40 },
  screenTitle: { fontSize: 34, fontWeight: "800", color: theme.foreground, letterSpacing: -0.5, marginBottom: 16 },
  kpiRow: {
    flexDirection: "row",
    backgroundColor: theme.card,
    borderRadius: 12,
    marginBottom: 16,
    paddingVertical: 14,
  },
  kpiCell: { flex: 1, alignItems: "center", paddingHorizontal: 6 },
  kpiCellDivider: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: theme.border },
  kpiValue: { fontSize: 20, fontWeight: "800", color: theme.foreground },
  kpiValueAccent: { fontSize: 16 },
  kpiLabel: { fontSize: 11, color: theme.mutedForeground, marginTop: 4, textAlign: "center" },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  emptyCard: { borderRadius: 12, padding: 16, backgroundColor: theme.card, gap: 10, alignItems: "center", marginBottom: 16 },
  emptyLink: { paddingVertical: 4 },
  emptyLinkRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  emptyLinkText: { fontSize: 14, fontWeight: "700", color: theme.foreground },
  favoriteCard: { borderRadius: 15, padding: 16, backgroundColor: theme.card, marginBottom: 10 },
  cardTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  timeNumber: { fontSize: 22, fontWeight: "800", color: theme.foreground, width: 80, flexShrink: 0 },
  cardContent: { flex: 1, minWidth: 0 },
  titleRowInner: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  favoriteCourseTitle: { fontSize: 19, fontWeight: "800", color: theme.foreground, flexShrink: 1 },
  statusTagWrap: { alignSelf: "flex-start", marginTop: 6 },
  meta: { fontSize: 13, color: theme.mutedForeground, marginTop: 6 },
  cardBottomSection: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border },
  capacityRow: { marginBottom: 12 },
  cardActionRow: { flexDirection: "row", justifyContent: "flex-end" },
  chartCard: { backgroundColor: theme.card, borderRadius: 12, padding: 14, marginBottom: 16 },
  chartRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  chartColumn: { alignItems: "center", flex: 1 },
  chartBarTrack: { height: CHART_HEIGHT, justifyContent: "flex-end" },
  chartBarFill: { width: 18, borderRadius: 3 },
  chartLabel: { fontSize: 11, color: theme.mutedForeground, marginTop: 6 },
  row: { backgroundColor: theme.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  courseTitle: { fontSize: 14, fontWeight: "600", color: theme.foreground },
  count: { fontSize: 14, fontWeight: "700", color: theme.foreground },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: theme.secondary, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
  historyCard: { backgroundColor: theme.card, borderRadius: 12, marginBottom: 10 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  historyRowLast: { borderBottomWidth: 0 },
  historyDate: { fontSize: 12, color: theme.mutedForeground, width: 66, flexShrink: 0 },
  historyTitle: { fontSize: 13, fontWeight: "600", color: theme.foreground, flex: 1 },
  historyLocation: { fontSize: 12, color: theme.mutedForeground, flexShrink: 0 },
});
