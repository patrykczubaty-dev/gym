import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from "react-native";
import { X } from "lucide-react-native";
import { theme } from "../lib/theme";
import { useBranding } from "../lib/branding-context";
import type { ParticipantsResponse } from "../lib/types";

// Zeigt die Kursinfos, die wir serverseitig ohnehin schon laden (Trainer,
// Ort, Dauer, Beschreibung) plus optional die Teilnehmerliste in EINER
// Ansicht statt zwei getrennten Tap-Zielen (Details-Button + Teilnehmer-
// Chip) - bewusst ohne neue Datenfelder (Level/Mitbringen o.ae. existieren
// nicht im Schema, siehe Absprache).
export function CourseDetailSheet({
  visible,
  title,
  meta,
  trainer,
  location,
  durationMinutes,
  description,
  participants,
  onClose,
}: {
  visible: boolean;
  title: string;
  meta: string;
  trainer: string;
  location: string;
  durationMinutes: number;
  description: string | null;
  // undefined = Teilnehmerliste wird auf diesem Screen (noch) nicht
  // eingebunden (z.B. Start-Tab), null = laedt gerade, Objekt = geladen.
  participants?: ParticipantsResponse | null;
  onClose: () => void;
}) {
  const branding = useBranding();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.meta}>{meta}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Schließen">
              <X size={22} color={theme.foreground} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {trainer && (
                <View style={styles.gridCell}>
                  <Text style={styles.gridLabel}>Trainer</Text>
                  <Text style={styles.gridValue} numberOfLines={1}>{trainer}</Text>
                </View>
              )}
              <View style={styles.gridCell}>
                <Text style={styles.gridLabel}>Ort</Text>
                <Text style={styles.gridValue} numberOfLines={1}>{location}</Text>
              </View>
              <View style={[styles.gridCell, styles.gridCellLast]}>
                <Text style={styles.gridLabel}>Dauer</Text>
                <Text style={styles.gridValue} numberOfLines={1}>{durationMinutes} Min.</Text>
              </View>
            </View>

            {description && <Text style={styles.description}>{description}</Text>}

            {participants !== undefined && (
              <View style={styles.participantsSection}>
                {!participants ? (
                  <>
                    <Text style={styles.sectionLabel}>Teilnehmer</Text>
                    <Text style={styles.meta}>Lädt…</Text>
                  </>
                ) : (
                  <View style={styles.participantsColumns}>
                    <View style={styles.participantsColumn}>
                      <Text style={styles.sectionLabel}>Teilnehmer ({participants.booked.length})</Text>
                      {participants.booked.length === 0 && (
                        <Text style={styles.meta}>Noch niemand gebucht.</Text>
                      )}
                      {participants.booked.map((p, i) => (
                        <Text
                          key={i}
                          style={[styles.participantName, p.isMe && { color: branding.primaryColor }]}
                        >
                          {p.name}
                          {p.isMe ? " (du)" : ""}
                        </Text>
                      ))}
                    </View>
                    {participants.waitlisted.length > 0 && (
                      <View style={[styles.participantsColumn, styles.participantsColumnLast]}>
                        <Text style={styles.sectionLabel}>Warteliste ({participants.waitlisted.length})</Text>
                        {participants.waitlisted.map((p, i) => (
                          <Text
                            key={i}
                            style={[styles.participantName, p.isMe && { color: branding.primaryColor }]}
                          >
                            {p.position}. {p.name}
                            {p.isMe ? " (du)" : ""}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: theme.cardElevated,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 22,
    paddingBottom: 32,
    maxHeight: "78%",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  title: { fontSize: 19, fontWeight: "800", color: theme.foreground },
  meta: { fontSize: 13, color: theme.mutedForeground, marginTop: 4 },
  scroll: { flexGrow: 0 },
  grid: { flexDirection: "row", marginTop: 18, borderTopWidth: 1, borderTopColor: theme.border },
  gridCell: { flex: 1, paddingTop: 12, paddingBottom: 4, paddingRight: 12 },
  gridCellLast: { paddingRight: 0 },
  gridLabel: { fontSize: 11, fontWeight: "700", color: theme.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 },
  gridValue: { fontSize: 15, fontWeight: "700", color: theme.foreground, marginTop: 3 },
  description: { fontSize: 13, color: theme.foreground, lineHeight: 19, marginTop: 16 },
  participantsSection: { marginTop: 16, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 },
  participantsColumns: { flexDirection: "row" },
  participantsColumn: { flex: 1, paddingRight: 12 },
  participantsColumnLast: { paddingRight: 0, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: theme.border },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.mutedForeground,
    marginTop: 8,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  participantName: { fontSize: 14, color: theme.foreground, paddingVertical: 4 },
});
