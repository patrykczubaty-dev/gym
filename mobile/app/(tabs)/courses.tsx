import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  SectionList,
  Pressable,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  Animated,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type ViewToken,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isSameWeek, isSameDay, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, getISOWeek } from "date-fns";
import { ChevronRight, ChevronLeft, ChevronDown, Check, MapPin, X } from "lucide-react-native";
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
import type { CourseEvent, ParticipantsResponse } from "../../lib/types";

const ALL_LOCATIONS = "Alle";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

// Ohne Uhrzeit - die traegt jetzt die grosse Ziffer in der Kartenzeile
// (Mockup-Hierarchie: Zeit ist die wichtigste Information einer Kursliste).
function formatCompactMeta(startsAt: string, endsAt: string, city: string, trainerFullName: string): string {
  const firstName = trainerFullName.split(" ")[0];
  return `${city} · ${firstName} · ${durationMinutes(startsAt, endsAt)} Min.`;
}

function formatDetailMeta(startsAt: string): string {
  return new Date(startsAt).toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayLabel(date: Date): string {
  return date.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit" });
}

// "20.-26. Juli" bzw. bei Monatswechsel "28. Juli-3. August".
function weekRangeLabel(weekStart: Date): string {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const startLabel = sameMonth
    ? `${weekStart.getDate()}.`
    : `${weekStart.getDate()}. ${weekStart.toLocaleDateString("de-DE", { month: "long" })}`;
  const endLabel = `${weekEnd.getDate()}. ${weekEnd.toLocaleDateString("de-DE", { month: "long" })}`;
  return `${startLabel}–${endLabel}`;
}

function weekDayDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export default function CoursesScreen() {
  const { token } = useAuth();
  const branding = useBranding();
  const insets = useSafeAreaInsets();
  const { openEventId } = useLocalSearchParams<{ openEventId?: string }>();
  const router = useRouter();
  // Verhindert erneutes Oeffnen derselben Deep-Link-Ziel-ID, falls das Sheet
  // bereits einmal per Tap-Route geoeffnet und wieder geschlossen wurde.
  const handledOpenEventIdRef = useRef<string | null>(null);
  const [events, setEvents] = useState<CourseEvent[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState(ALL_LOCATIONS);
  const [selectedWeek, setSelectedWeek] = useState<0 | 1>(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [detailFor, setDetailFor] = useState<CourseEvent | null>(null);
  const [detailParticipants, setDetailParticipants] = useState<ParticipantsResponse | null>(null);
  // Welche Tage EINGEKLAPPT sind (nicht: welche offen sind) - Standard ist
  // eine leere Menge, also starten beim Oeffnen der Seite alle Tage
  // aufgeklappt (Nutzerwunsch). Jeder Tag laesst sich unabhaengig von den
  // anderen per Tap auf seine Kopfzeile zuklappen.
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(() => new Set());
  // Name ist historisch (frueher nur per Tap auf die Tagesleiste gesetzt) -
  // wird jetzt zusaetzlich per Scroll-Spy aktualisiert (siehe
  // onViewableItemsChanged), damit die Tagesleiste beim freien Scrollen
  // denselben Tag markiert wie den, der gerade im Viewport steht (Absprache).
  const [lastScrolledDay, setLastScrolledDay] = useState<number | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const sectionListRef = useRef<SectionList<CourseEvent>>(null);

  // "Collapsing Header"-Muster (bekannt aus Spotify/Twitter/YouTube): die
  // Tagesleiste steht zunaechst normal unter Begruessung+Filtern (richtige
  // Lesereihenfolge), und wird erst als fixe Leiste eingeblendet, sobald sie
  // durch Scrollen aus dem Blickfeld waere - bleibt so immer erreichbar, ohne
  // dauerhaft Platz zu belegen. Zeigt bewusst dieselbe grosse Tagesleiste wie
  // ungescrollt (nicht eine kompaktere Variante), damit sich die Optik beim
  // Anheften nicht sichtbar aendert.
  const [dayBarPinned, setDayBarPinned] = useState(false);
  const dayBarPinnedRef = useRef(false);
  const headerHeightRef = useRef(0);
  // Hoehe der angehefteten Tagesleiste (siehe dayRailBarFixed) - die liegt
  // als Overlay UEBER dem Listeninhalt statt eigenen Platz einzunehmen. Ohne
  // Ausgleich landet scrollToLocation den Zielabschnitt exakt an der
  // Oberkante, wo ihn das Overlay dann verdeckt (gemeldeter Bug: erster Kurs
  // nach Tap auf die Tagesleiste halb abgeschnitten).
  const dayRailBarHeightRef = useRef(0);
  const [pinnedOpacity] = useState(() => new Animated.Value(0));

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = event.nativeEvent.contentOffset.y;
    const shouldPin = headerHeightRef.current > 0 && y > headerHeightRef.current - 24;
    if (shouldPin !== dayBarPinnedRef.current) {
      dayBarPinnedRef.current = shouldPin;
      setDayBarPinned(shouldPin);
      Animated.timing(pinnedOpacity, { toValue: shouldPin ? 1 : 0, duration: 180, useNativeDriver: true }).start();
    }
  }

  // Scroll-Spy fuer die Tagesleiste (Nutzerwunsch): markiert beim freien
  // Scrollen automatisch den Tag, dessen Abschnitt gerade oben im Viewport
  // steht - genau wie ein Tap auf die Leiste, nur ohne den Tap. Section-
  // Header zaehlen als eigene Items, daher reicht das oberste sichtbare
  // Item (per flachem Listenindex bestimmt) fuer den korrekten Tag.
  const [viewabilityConfig] = useState({ itemVisiblePercentThreshold: 1 });
  const [onViewableItemsChanged] = useState(() => ({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length === 0) return;
    const topMost = viewableItems.reduce((min, vi) =>
      vi.index !== null && (min.index === null || (vi.index as number) < (min.index as number)) ? vi : min,
    );
    const sectionIndex = (topMost.section as { index: number } | undefined)?.index;
    if (typeof sectionIndex === "number") {
      setLastScrolledDay(sectionIndex);
    }
  });

  const gradientColors = useMemo(() => brandGradient(branding.primaryColor), [branding.primaryColor]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<{ events: CourseEvent[]; locations: string[] }>("/api/mobile/courses", { token });
      setEvents(data.events);
      setLocations(data.locations);
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Kurse konnten nicht geladen werden. Zieh nach unten, um es erneut zu versuchen.",
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

  // Oeffnet Kursinfo + Teilnehmerliste in EINEM Sheet statt zwei getrennten
  // Tap-Zielen (ehemals Details-Button + Teilnehmer-Chip, siehe Absprache).
  async function openDetail(event: CourseEvent) {
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

  const now = new Date();

  const weekStart = useMemo(() => {
    const base = startOfWeek(now, { weekStartsOn: 1 });
    return selectedWeek === 0 ? base : addWeeks(base, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek]);
  const otherWeekStart = selectedWeek === 0 ? addWeeks(weekStart, 1) : subWeeks(weekStart, 1);

  const visibleEvents = useMemo(() => {
    return events
      .filter((e) => selectedLocation === ALL_LOCATIONS || e.location.city === selectedLocation)
      .filter((e) => {
        const eventDate = new Date(e.startsAt);
        const inCurrentWeek = isSameWeek(eventDate, now, { weekStartsOn: 1 });
        return selectedWeek === 0 ? inCurrentWeek : !inCurrentWeek;
      });
  }, [events, selectedLocation, selectedWeek]); // eslint-disable-line react-hooks/exhaustive-deps

  const sections = useMemo(() => {
    const groups: { title: string; data: CourseEvent[] }[] = [];
    for (const event of visibleEvents) {
      const eventDate = new Date(event.startsAt);
      const existing = groups.find((g) => isSameDay(new Date(g.data[0].startsAt), eventDate));
      if (existing) {
        existing.data.push(event);
      } else {
        groups.push({ title: dayLabel(eventDate), data: [event] });
      }
    }
    return groups;
  }, [visibleEvents]);

  const activeDate =
    lastScrolledDay !== null && sections[lastScrolledDay]
      ? new Date(sections[lastScrolledDay].data[0].startsAt)
      : sections[0]
        ? new Date(sections[0].data[0].startsAt)
        : null;

  // Zuruecksetzen, sobald sich die sichtbaren Tage aendern (anderer Filter/
  // andere Woche) - sonst bleiben faelschlich Tage aufgeklappt, die es im
  // neuen Zeitraum gar nicht mehr gibt. Bewusst als "State beim Rendern
  // anpassen" statt useEffect (React-Doku-Empfehlung fuer Reset-bei-Prop-
  // Aenderung, spart einen zusaetzlichen Render-Durchlauf).
  const filterKey = `${selectedLocation}|${selectedWeek}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setCollapsedDays(new Set());
    setLastScrolledDay(null);
  }

  // Akkordeon statt durchgehender Liste (UI/UX-Review): Tage lassen sich
  // einzeln einklappen, um die sichtbare Kartenzahl zu reduzieren - starten
  // aber beim Oeffnen der Seite bzw. nach einem Filterwechsel immer
  // vollstaendig aufgeklappt (Nutzerwunsch). Jeder Tag laesst sich
  // unabhaengig von den anderen per Tap auf seine Kopfzeile zuklappen. Die
  // Tages-Elemente oben beeinflussen den Auf/Zu-Zustand bewusst NICHT - sie
  // scrollen nur zum jeweiligen Tag (siehe goToDay).
  const visibleSections = sections.map((section, index) => ({
    title: section.title,
    index,
    count: section.data.length,
    data: collapsedDays.has(index) ? [] : section.data,
  }));

  function toggleDay(index: number) {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  // scrollToLocation schlaegt fehl, wenn das Ziel noch nicht gemessen wurde
  // (weit unten in einer langen Liste) - Standard-Workaround laut RN-Doku:
  // Ziel merken und nach kurzer Verzoegerung erneut versuchen, sobald durch
  // den ersten (teilweisen) Scroll mehr Items gerendert/gemessen wurden.
  const pendingScrollSectionIndex = useRef<number | null>(null);

  function scrollToSection(index: number) {
    sectionListRef.current?.scrollToLocation({
      sectionIndex: index,
      itemIndex: 0,
      viewPosition: 0,
      viewOffset: dayRailBarHeightRef.current,
    });
  }

  function goToDay(index: number) {
    setLastScrolledDay(index);
    pendingScrollSectionIndex.current = index;
    scrollToSection(index);
    // RN schaetzt die Zielposition fuer noch nicht gemessene, weiter entfernte
    // Zellen nur grob (kein echter Fehlschlag, landet aber ungenau) - ein
    // Korrektur-Scroll kurz danach nutzt die inzwischen durch den ersten
    // Scroll gemessenen Zellen und landet praezise.
    setTimeout(() => scrollToSection(index), 150);
  }

  function goToDate(date: Date) {
    const targetIndex = sections.findIndex((s) => isSameDay(new Date(s.data[0].startsAt), date));
    if (targetIndex !== -1) goToDay(targetIndex);
  }

  function handleScrollToIndexFailed() {
    const target = pendingScrollSectionIndex.current;
    if (target === null) return;
    setTimeout(() => scrollToSection(target), 100);
  }

  function renderDayRail() {
    return (
      <View style={styles.dayRail}>
        {weekDayDates(weekStart).map((date) => {
          const isActive = activeDate !== null && isSameDay(date, activeDate);
          const hasCourses = sections.some((s) => isSameDay(new Date(s.data[0].startsAt), date));
          return (
            <Pressable
              key={date.toISOString()}
              onPress={() => goToDate(date)}
              disabled={!hasCourses}
              style={styles.dayRailItem}
              accessibilityRole="button"
              accessibilityLabel={`${dayLabel(date)}${hasCourses ? "" : ", keine Kurse"}`}
            >
              <Text
                style={[
                  styles.dayRailNumber,
                  !hasCourses && styles.dayRailNumberMuted,
                  isActive && { color: branding.primaryColor },
                ]}
              >
                {date.getDate()}
              </Text>
              <Text style={[styles.dayRailLabel, isActive && { color: branding.primaryColor, fontWeight: "800" }]}>
                {date.toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 2).toUpperCase()}
              </Text>
              {isActive && <View style={[styles.dayRailUnderline, { backgroundColor: branding.primaryColor }]} />}
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {loadError && <InlineError message={loadError} />}

      {sections.length > 1 && (
        <Animated.View
          style={[styles.dayRailBarFixed, { opacity: pinnedOpacity, paddingTop: insets.top + 12 }]}
          pointerEvents={dayBarPinned ? "auto" : "none"}
          onLayout={(e) => {
            dayRailBarHeightRef.current = e.nativeEvent.layout.height;
          }}
        >
          {renderDayRail()}
        </Animated.View>
      )}

      <SectionList
        ref={sectionListRef}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 16 }]}
        sections={visibleSections}
        keyExtractor={(e) => e.id}
        stickySectionHeadersEnabled={false}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.mutedForeground} />}
        ListHeaderComponent={
          <View onLayout={(e) => { headerHeightRef.current = e.nativeEvent.layout.height; }}>
            <View style={styles.titleRow}>
              <Text style={styles.screenTitle}>Kurse</Text>
              {locations.length > 1 && (
                <Pressable
                  onPress={() => setLocationPickerOpen(true)}
                  style={styles.locationTrigger}
                  accessibilityRole="button"
                  accessibilityLabel={`Standort-Filter, aktuell ${selectedLocation}`}
                >
                  <MapPin size={14} color={branding.primaryColor} />
                  <Text style={styles.locationTriggerText} numberOfLines={1}>{selectedLocation}</Text>
                  <ChevronDown size={14} color={theme.mutedForeground} />
                </Pressable>
              )}
            </View>

            <View style={styles.weekRow}>
              <Text style={styles.weekLabel}>
                KW {getISOWeek(weekStart)} · {weekRangeLabel(weekStart)}
              </Text>
              <Pressable
                onPress={() => setSelectedWeek(selectedWeek === 0 ? 1 : 0)}
                style={styles.weekJumpLink}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.weekJumpLinkText, { color: branding.primaryColor }]}>
                  {selectedWeek === 0 ? `KW ${getISOWeek(otherWeekStart)} buchen` : `KW ${getISOWeek(otherWeekStart)}`}
                </Text>
                {selectedWeek === 0 ? (
                  <ChevronRight size={14} color={branding.primaryColor} />
                ) : (
                  <ChevronLeft size={14} color={branding.primaryColor} />
                )}
              </Pressable>
            </View>

            {renderDayRail()}
          </View>
        }
        renderSectionHeader={({ section }) => {
          const active = !collapsedDays.has(section.index);
          return (
            <Pressable
              onPress={() => toggleDay(section.index)}
              style={styles.dayHeaderRow}
              hitSlop={{ top: 8, bottom: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`${section.title}, ${section.count} ${section.count === 1 ? "Kurs" : "Kurse"}${active ? ", aufgeklappt" : ""}`}
            >
              <Text style={[styles.dayHeader, active && { color: theme.foreground }]}>{section.title}</Text>
              <View style={styles.dayHeaderRight}>
                <Text style={styles.dayHeaderCount}>
                  {section.count} {section.count === 1 ? "Kurs" : "Kurse"}
                </Text>
                {active ? (
                  <ChevronDown size={16} color={branding.primaryColor} />
                ) : (
                  <ChevronRight size={16} color={theme.mutedForeground} />
                )}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Keine Kurse
            {selectedLocation !== ALL_LOCATIONS ? ` in ${selectedLocation}` : ""}
            {selectedWeek === 0 ? " diese Woche" : " nächste Woche"}. Probier einen anderen Standort oder
            die {selectedWeek === 0 ? "nächste" : "aktuelle"} Woche.
          </Text>
        }
        renderItem={({ item }) => {
          const isFull = item.occupancy === "red";
          const quotaReached = item.weeklyQuota !== null && item.weeklyQuota.usedThisWeek >= item.weeklyQuota.limit;
          return (
            <View style={styles.card}>
              <Pressable
                onPress={() => openDetail(item)}
                accessibilityRole="button"
                accessibilityLabel={`Details zu ${item.course.title} anzeigen`}
              >
                <View style={styles.cardTopRow}>
                  <Text style={styles.timeNumber} numberOfLines={1}>{formatTime(item.startsAt)}</Text>
                  <View style={styles.cardContent}>
                    <View style={styles.titleRowInner}>
                      <Text style={styles.courseTitle} numberOfLines={1}>{item.course.title}</Text>
                      <ChevronRight size={16} color={theme.mutedForeground} />
                    </View>
                    <Text style={styles.meta}>
                      {formatCompactMeta(item.startsAt, item.endsAt, item.location.city, item.course.trainer)}
                    </Text>
                  </View>
                </View>
              </Pressable>

              <View style={styles.cardBottomSection}>
                {item.ownBookingStatus === "BOOKED" && !item.canCancel && item.cancellationCutoffHours !== null && (
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
                    status={item.ownBookingStatus}
                    bookingId={item.ownBookingId}
                    canCancel={item.canCancel}
                    isFull={isFull}
                    quotaReached={quotaReached}
                    courseTitle={item.course.title}
                    startsAt={item.startsAt}
                    location={item.location.city}
                    weeklyQuota={item.weeklyQuota}
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

      <Modal
        visible={locationPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setLocationPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setLocationPickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Standort</Text>
              <Pressable onPress={() => setLocationPickerOpen(false)} hitSlop={12} accessibilityLabel="Schließen">
                <X size={22} color={theme.foreground} />
              </Pressable>
            </View>
            {[ALL_LOCATIONS, ...locations].map((loc) => {
              const active = loc === selectedLocation;
              return (
                <Pressable
                  key={loc}
                  style={styles.locationOption}
                  onPress={() => {
                    setSelectedLocation(loc);
                    setLocationPickerOpen(false);
                  }}
                >
                  <Text style={[styles.locationOptionText, active && { color: branding.primaryColor, fontWeight: "700" }]}>
                    {loc}
                  </Text>
                  {active && <Check size={17} color={branding.primaryColor} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <CourseDetailSheet
        visible={detailFor !== null}
        title={detailFor?.course.title ?? ""}
        meta={detailFor ? formatDetailMeta(detailFor.startsAt) : ""}
        trainer={detailFor?.course.trainer ?? ""}
        location={detailFor?.location.city ?? ""}
        durationMinutes={detailFor ? durationMinutes(detailFor.startsAt, detailFor.endsAt) : 0}
        description={detailFor?.course.description ?? null}
        participants={detailParticipants}
        onClose={() => setDetailFor(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  list: { padding: 16, gap: 12 },
  empty: { textAlign: "center", color: theme.mutedForeground, marginTop: 40 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  screenTitle: { fontSize: 34, fontWeight: "800", color: theme.foreground, letterSpacing: -0.5 },
  locationTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    maxWidth: 140,
  },
  locationTriggerText: { fontSize: 13, fontWeight: "700", color: theme.foreground, flexShrink: 1 },
  locationOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  locationOptionText: { fontSize: 15, color: theme.foreground },
  weekRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  weekLabel: { fontSize: 14, fontWeight: "800", color: theme.foreground },
  weekJumpLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  weekJumpLinkText: { fontSize: 13, fontWeight: "700" },
  dayRail: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: theme.border },
  dayRailItem: { alignItems: "center", gap: 4, paddingBottom: 4, flex: 1 },
  dayRailNumber: { fontSize: 22, fontWeight: "800", color: theme.foreground },
  dayRailNumberMuted: { color: theme.mutedForeground, opacity: 0.5 },
  dayRailLabel: { fontSize: 10, fontWeight: "700", color: theme.mutedForeground, letterSpacing: 0.5 },
  dayRailUnderline: { height: 3, width: 22, borderRadius: 2, marginTop: 2 },
  dayRailBarFixed: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: theme.background,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  dayHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
    paddingVertical: 4,
  },
  dayHeader: { fontSize: 13, fontWeight: "700", color: theme.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 },
  dayHeaderRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  dayHeaderCount: { fontSize: 12, color: theme.mutedForeground },
  card: { borderRadius: 15, padding: 16, marginBottom: 14, backgroundColor: theme.card },
  cardTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  timeNumber: { fontSize: 22, fontWeight: "800", color: theme.foreground, width: 80, flexShrink: 0 },
  cardContent: { flex: 1, minWidth: 0 },
  titleRowInner: { flexDirection: "row", alignItems: "center", gap: 4 },
  courseTitle: { fontSize: 19, fontWeight: "800", color: theme.foreground, flexShrink: 1 },
  statusTagWrap: { alignSelf: "flex-start", marginTop: 6 },
  meta: { fontSize: 13, color: theme.mutedForeground, marginTop: 6 },
  cardBottomSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  capacityRow: { marginBottom: 12 },
  cardActionRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center" },
  cutoffNote: { fontSize: 11, color: theme.warning, marginBottom: 8 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: theme.cardElevated,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 22,
    maxHeight: "70%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: theme.foreground },
});
