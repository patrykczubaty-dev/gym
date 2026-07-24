import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { isSameWeek, startOfWeek } from "date-fns";
import { ChevronRight, Check } from "lucide-react-native";
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
import type { Booking, ParticipantsResponse, WeeklyQuota } from "../../lib/types";

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

// Freundliche, variantenreiche Begruessung statt statischem "Hallo, Name" -
// haengt sowohl von der Tageszeit als auch vom Buchungsstand dieser Woche
// ab (Nutzerwunsch: "schoen dass du wieder da bist" bzw. "fit unterwegs"
// als Vorbilder). `variantSeed` waehlt EINMAL pro Sitzung eine Variante
// innerhalb des passenden Topfs aus (stabil ueber Pull-to-Refresh hinweg),
// statt bei jedem Datenabruf neu zu wuerfeln.
function buildGreeting(
  firstName: string,
  bookingsThisWeek: number,
  weeklyLimit: number | null,
  now: Date,
  variantSeed: number,
): string {
  function pick(variants: string[]): string {
    return variants[Math.floor(variantSeed * variants.length)];
  }

  if (bookingsThisWeek === 0) {
    return pick([`Schön, dass du wieder da bist, ${firstName}!`, `Willkommen zurück, ${firstName}!`]);
  }

  if (weeklyLimit !== null && bookingsThisWeek >= weeklyLimit) {
    return pick([`Richtig fit unterwegs, ${firstName}!`, `Dein Wochenpensum steht schon, ${firstName}!`]);
  }

  const hour = now.getHours();
  if (hour >= 5 && hour < 11) {
    return pick([`Guten Morgen, ${firstName}!`, `Früh unterwegs? Guten Morgen, ${firstName}!`]);
  }
  if (hour >= 11 && hour < 17) {
    return pick([`Schön, dass du reinschaust, ${firstName}!`, `Hallo ${firstName}, alles fit soweit?`]);
  }
  return pick([`Guten Abend, ${firstName}!`, `Noch Lust auf einen Kurs heute, ${firstName}?`]);
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

// Kombiniert die fruehere "Buchungen"-Seite mit einer neuen Stammkurse-
// Uebersicht und ist jetzt die Start-Tab (siehe _layout.tsx) - Begruessung
// lebt deshalb hier statt auf dem Kurse-Tab (UI/UX-Entscheidung, kein
// doppelter Gruss auf zwei Screens).
export default function BookingsScreen() {
  const { token, customer } = useAuth();
  const branding = useBranding();
  const insets = useSafeAreaInsets();
  const gradientColors = useMemo(() => brandGradient(branding.primaryColor), [branding.primaryColor]);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [weeklyLimit, setWeeklyLimit] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [variantSeed] = useState(() => Math.random());
  // Ein gemeinsamer Detail-Zustand fuer Buchungs- UND Stammkurs-Karten -
  // beide oeffnen dasselbe Sheet mit Kursinfo + Teilnehmerliste (siehe
  // CourseDetailSheet), statt getrennter Modals pro Kartentyp.
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);
  const [detailParticipants, setDetailParticipants] = useState<ParticipantsResponse | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const bookingsData = await apiFetch<{ bookings: Booking[]; weeklyLimit: number | null }>(
        "/api/mobile/bookings",
        { token },
      );
      setBookings(bookingsData.bookings);
      setWeeklyLimit(bookingsData.weeklyLimit);
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Daten konnten nicht geladen werden. Zieh nach unten, um es erneut zu versuchen.",
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

  // Nur fuer "Platz sichern" bei einem frei gewordenen Wartelistenplatz
  // relevant (siehe BookingAction) - diese Liste zeigt sonst nie einen
  // Termin mit status===null, ueber den man neu buchen koennte.
  async function bookEvent(calendarEventId: string) {
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

  // Kontingent gilt pro Kalenderwoche des jeweiligen Termins (nicht "jetzt")
  // - eine Buchung fuer naechste Woche zu stornieren aendert nichts am
  // Kontingent dieser Woche, siehe auch api/mobile/bookings/route.ts.
  // Wartelistenplaetze zaehlen wie Buchungen mit (siehe Absprache).
  function quotaForBooking(booking: Booking): WeeklyQuota {
    if (weeklyLimit === null) return null;
    const bookingWeekStart = startOfWeek(new Date(booking.startsAt), { weekStartsOn: 1 });
    const usedThisWeek = bookings.filter(
      (b) =>
        (b.status === "BOOKED" || b.status === "WAITLISTED") &&
        b.course !== null &&
        isSameWeek(new Date(b.startsAt), bookingWeekStart, { weekStartsOn: 1 }),
    ).length;
    return { limit: weeklyLimit, usedThisWeek };
  }

  // Gleiche Kartenstruktur wie Kurse-/Events-Tab (Absprache: Widgets sollen
  // einheitlich aussehen) - inkl. Belegungsbalken/Wartelisten-Pille und
  // BookingAction statt eines eigenen, schlankeren Karten-Layouts.
  // quotaReached ist hier nie relevant (jede Karte hat bereits einen Status,
  // der "noch nicht gebucht"-Zweig wird nie erreicht) - isFull/onBook
  // dagegen schon: "Platz sichern" bei einem frei gewordenen Wartelistenplatz
  // nutzt beides (siehe BookingAction).
  function renderBooking(item: Booking) {
    // Events (z.B. "Tag der offenen Tuer") haben kein course-Feld, aber ein
    // eigenes event-Feld mit Titel/Beschreibung - "Termin" bleibt nur der
    // Notfall-Fallback, falls beides fehlt.
    const title = item.course?.title ?? item.event?.title ?? "Termin";
    const description = item.course?.description ?? item.event?.description ?? null;
    // Ausgegraut statt versteckt (UI/UX-Review): weder Stornieren noch
    // Belegung sind fuer einen vergangenen Termin noch relevant, ein
    // "Besucht"-Tag ersetzt daher CapacityBar/BookingAction.
    const isPast = new Date(item.startsAt) < new Date();
    return (
      <View key={item.id} style={[styles.card, isPast && styles.cardPast]}>
        <Pressable
          onPress={() =>
            openDetail({
              eventId: item.calendarEventId,
              title,
              meta: formatDateTime(item.startsAt),
              trainer: item.course?.trainer ?? "",
              location: item.location.city,
              durationMinutes: durationMinutes(item.startsAt, item.endsAt),
              description,
            })
          }
          accessibilityRole="button"
          accessibilityLabel={`Details zu ${title} anzeigen`}
        >
          <View style={styles.cardTopRow}>
            <Text style={styles.timeNumber} numberOfLines={1}>
              {formatTime(item.startsAt)}
            </Text>
            <View style={styles.cardContent}>
              <View style={styles.titleRowInner}>
                <Text style={styles.courseTitle} numberOfLines={1}>
                  {title}
                </Text>
                <ChevronRight size={16} color={theme.mutedForeground} />
              </View>
              <Text style={styles.meta}>
                {formatDateOnly(item.startsAt)} · {item.location.city}
                {item.status === "WAITLISTED" ? ` · Warteliste Platz ${item.waitlistPosition}` : ""}
              </Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.cardBottomSection}>
          {isPast ? (
            <View style={styles.pastTag}>
              <Check size={14} color={theme.success} />
              <Text style={styles.pastTagText}>Besucht</Text>
            </View>
          ) : (
            <>
              {!item.canCancel && item.cancellationCutoffHours !== null && (
                <Text style={styles.cutoffNote}>
                  Stornofrist abgelaufen (spätestens {item.cancellationCutoffHours}h vorher möglich).
                </Text>
              )}
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
                  status={item.status}
                  bookingId={item.id}
                  canCancel={item.canCancel}
                  isFull={item.occupancy === "red"}
                  quotaReached={false}
                  courseTitle={title}
                  startsAt={item.startsAt}
                  location={item.location.city}
                  weeklyQuota={quotaForBooking(item)}
                  cancellationCutoffHours={item.cancellationCutoffHours}
                  gradientColors={gradientColors}
                  onBook={() => bookEvent(item.calendarEventId)}
                  onChange={load}
                />
              </View>
            </>
          )}
        </View>
      </View>
    );
  }

  // Nur die aktuelle Kalenderwoche, nicht alle anstehenden Buchungen
  // insgesamt - sonst wirkt die Zahl wie ein Verstoss gegen das
  // Wochenlimit des Vertrags (z.B. "4" bei 2x/Woche, obwohl das nur die
  // Summe aus dieser UND naechster Woche ist). Weitere Buchungen bleiben in
  // der Liste unten sichtbar, dort mit Datum erkennbar. Wartelistenplaetze
  // zaehlen wie Buchungen mit (siehe Absprache), damit der Ring denselben
  // Stand zeigt, den das Backend beim Buchen/Warteliste-Beitritt durchsetzt.
  const bookingsThisWeek = useMemo(
    () =>
      bookings.filter(
        (b) =>
          (b.status === "BOOKED" || b.status === "WAITLISTED") &&
          b.course !== null &&
          isSameWeek(new Date(b.startsAt), new Date(), { weekStartsOn: 1 }),
      ).length,
    [bookings],
  );

  const greeting = useMemo(
    () => buildGreeting(customer?.firstName ?? "", bookingsThisWeek, weeklyLimit, new Date(), variantSeed),
    [customer?.firstName, bookingsThisWeek, weeklyLimit, variantSeed],
  );

  // Bereits stattgefundene Termine dieser Woche bleiben jetzt sichtbar (statt
  // versteckt) und werden in renderBooking ausgegraut/als "Besucht" markiert
  // (UI/UX-Review) - vorher zeigte "Diese Woche" 0, obwohl das Kontingent
  // oben schon 2/2 auswies, weil vergangene Buchungen aus der Liste fielen,
  // im Zaehler aber weiterhin mitliefen. So stimmen Zaehler und Liste ueberein.
  // Events (course === null) laufen seit "Deine Events" in einer eigenen
  // Rubrik unten, nicht mehr vermischt mit den wochenweisen Kursbuchungen.
  const bookingsThisWeekList = useMemo(
    () =>
      bookings.filter(
        (b) => b.course !== null && isSameWeek(new Date(b.startsAt), new Date(), { weekStartsOn: 1 }),
      ),
    [bookings],
  );
  const bookingsNextWeekList = useMemo(
    () =>
      bookings.filter((b) => b.course !== null && !isSameWeek(new Date(b.startsAt), new Date(), { weekStartsOn: 1 })),
    [bookings],
  );
  const eventBookingsList = useMemo(
    () =>
      bookings
        .filter((b) => b.course === null && new Date(b.startsAt) >= new Date())
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [bookings],
  );
  const pastBookedThisWeek = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.status === "BOOKED" &&
          b.course !== null &&
          isSameWeek(new Date(b.startsAt), new Date(), { weekStartsOn: 1 }) &&
          new Date(b.startsAt) < new Date(),
      ).length,
    [bookings],
  );

  return (
    <View style={styles.screen}>
      {loadError && <InlineError message={loadError} />}
      <ScrollView
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 16 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.mutedForeground} />}
      >
        <View style={styles.hero}>
          <Text style={styles.heroGreeting}>{greeting}</Text>
          {weeklyLimit !== null ? (
            // Farblich abgesetzte Flaeche statt neutraler Karte (UI/UX-Review):
            // hebt den Kontingent-Bereich von den Kurskarten darunter ab, ohne
            // eine neue Form (Ring) einzufuehren - der Balken bleibt dieselbe
            // Sprache wie CapacityBar, nur die Flaeche macht ihn zum Blickfang.
            <View style={[styles.quotaCard, { backgroundColor: branding.primaryColor + "14" }]}>
              <Text style={styles.quotaLabel}>Kurse diese Woche</Text>
              <View style={styles.quotaBarRow}>
                <View style={styles.quotaBarTrack}>
                  <View
                    style={[
                      styles.quotaBarFill,
                      { width: `${Math.min(bookingsThisWeek / weeklyLimit, 1) * 100}%`, backgroundColor: branding.primaryColor },
                    ]}
                  />
                </View>
                <Text style={[styles.quotaBarCount, { color: branding.primaryColor }]}>
                  {bookingsThisWeek}/{weeklyLimit}
                </Text>
              </View>
              {(pastBookedThisWeek > 0 || bookingsThisWeek >= weeklyLimit) && (
                <Text style={styles.quotaHint}>
                  {pastBookedThisWeek > 0 ? `${pastBookedThisWeek} bereits besucht` : ""}
                  {pastBookedThisWeek > 0 && bookingsThisWeek >= weeklyLimit ? " · " : ""}
                  {bookingsThisWeek >= weeklyLimit ? "Nächste Woche ist wieder frei." : ""}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.heroSubtitle}>
              {bookingsThisWeek} Kurse diese Woche
              {pastBookedThisWeek > 0 ? ` · ${pastBookedThisWeek} bereits besucht` : ""}
            </Text>
          )}
        </View>

        {bookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.empty}>
              {weeklyLimit !== null
                ? `Noch nichts gebucht. Diese Woche sind noch ${weeklyLimit} Plätze in deinem Kontingent frei.`
                : "Noch nichts gebucht."}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.weekSubheader}>
              <Text style={styles.weekSubheaderText}>Diese Woche</Text>
            </View>
            {bookingsThisWeekList.length === 0 ? (
              <Text style={styles.empty}>Keine Buchungen diese Woche.</Text>
            ) : (
              bookingsThisWeekList.map((item) => renderBooking(item))
            )}

            <View style={styles.weekSubheader}>
              <Text style={styles.weekSubheaderText}>Nächste Woche</Text>
            </View>
            {bookingsNextWeekList.length === 0 ? (
              <Text style={styles.empty}>Keine Buchungen nächste Woche.</Text>
            ) : (
              bookingsNextWeekList.map((item) => renderBooking(item))
            )}

            <View style={styles.weekSubheader}>
              <Text style={styles.weekSubheaderText}>Events</Text>
            </View>
            {eventBookingsList.length === 0 ? (
              <Text style={styles.empty}>Keine Events gebucht.</Text>
            ) : (
              eventBookingsList.map((item) => renderBooking(item))
            )}
          </>
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
  list: { padding: 16, gap: 12 },
  hero: { marginTop: 8 },
  heroGreeting: { fontSize: 26, fontWeight: "800", color: theme.foreground, letterSpacing: -0.3 },
  heroSubtitle: { fontSize: 14, fontWeight: "600", color: theme.mutedForeground, marginTop: 6 },
  quotaCard: {
    borderRadius: 15,
    padding: 14,
    marginTop: 14,
    gap: 8,
  },
  quotaLabel: { fontSize: 13, fontWeight: "700", color: theme.mutedForeground },
  quotaBarRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  quotaBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: theme.secondary, overflow: "hidden" },
  quotaBarFill: { height: 8, borderRadius: 4 },
  quotaBarCount: { fontSize: 15, fontWeight: "800" },
  quotaHint: { fontSize: 12, fontWeight: "500", color: theme.mutedForeground },
  weekSubheader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  weekSubheaderText: { fontSize: 15, fontWeight: "800", color: theme.foreground },
  weekLink: { marginLeft: "auto" },
  weekLinkText: { fontSize: 13, fontWeight: "700" },
  empty: { textAlign: "center", color: theme.mutedForeground },
  emptyCard: { borderRadius: 15, padding: 16, backgroundColor: theme.card, gap: 10, alignItems: "center" },
  emptyLink: { paddingVertical: 4 },
  emptyLinkText: { fontSize: 14, fontWeight: "700" },
  card: { borderRadius: 15, padding: 16, backgroundColor: theme.card },
  cardPast: { opacity: 0.55 },
  cardTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  timeNumber: { fontSize: 22, fontWeight: "800", color: theme.foreground, width: 80, flexShrink: 0 },
  cardContent: { flex: 1, minWidth: 0 },
  titleRowInner: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  courseTitle: { fontSize: 19, fontWeight: "800", color: theme.foreground, flexShrink: 1 },
  statusTagWrap: { alignSelf: "flex-start", marginTop: 6 },
  meta: { fontSize: 13, color: theme.mutedForeground, marginTop: 6 },
  cutoffNote: { fontSize: 12, color: theme.warning, marginBottom: 10 },
  cardBottomSection: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border },
  capacityRow: { marginBottom: 12 },
  cardActionRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  cancelButtonGhost: { padding: 4 },
  pastTag: { flexDirection: "row", alignItems: "center", gap: 6 },
  pastTagText: { fontSize: 13, fontWeight: "700", color: theme.mutedForeground },
});
