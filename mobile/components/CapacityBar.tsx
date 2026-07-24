import { View, Text, StyleSheet } from "react-native";
import { Clock } from "lucide-react-native";
import { theme } from "../lib/theme";

type Occupancy = "green" | "yellow" | "red";

// Ersetzt Belegungs-Badge + Teilnehmer-Chip als EIN Element: die Fuellmenge
// ist in <100ms erfassbar (praeattentive Verarbeitung), statt "12/14" im
// Kopf umzurechnen. Farbe ist nie das einzige Signal (WCAG) - Balkenlaenge
// UND die Zahl daneben tragen dieselbe Information.
export function CapacityBar({
  bookedCount,
  capacity,
  occupancy,
  waitlistCount,
}: {
  bookedCount: number;
  capacity: number;
  occupancy: Occupancy;
  // Eigene Pille statt in den Zahlentext eingewoben (Absprache) - optional,
  // da nicht jeder Aufrufer die Warteliste kennt/anzeigen soll.
  waitlistCount?: number;
}) {
  const color = { green: theme.success, yellow: theme.warning, red: theme.destructive }[occupancy];
  const ratio = capacity > 0 ? Math.min(1, bookedCount / capacity) : 0;

  return (
    <View style={styles.row}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.count}>
        {bookedCount}/{capacity}
      </Text>
      {!!waitlistCount && (
        <View style={styles.waitlistPill}>
          <Clock size={11} color={theme.mutedForeground} />
          <Text style={styles.waitlistPillText}>{waitlistCount} Warteliste</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: theme.secondary, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  count: { fontSize: 13, fontWeight: "800", color: theme.foreground },
  waitlistPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: theme.card,
  },
  waitlistPillText: { fontSize: 11, fontWeight: "700", color: theme.mutedForeground },
});
