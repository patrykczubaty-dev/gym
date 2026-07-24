import { View, Text, Pressable, Modal, StyleSheet, ActivityIndicator } from "react-native";
import { theme } from "../lib/theme";

// Ersetzt Alert.alert() fuer Stornierungen: statt nur "Sicher?" zeigt dieses
// Bottom-Sheet vorher konkret, was passiert (Kontingent-Auswirkung,
// Stornofrist) - Fehlervermeidung/Verstaendnis statt spaeterer Ueberraschung
// (UI/UX-Review). Rein praesentational, die Konsequenz-Formulierung kommt
// aus lib/cancelCopy.ts.
export function CancelSheet({
  visible,
  title,
  meta,
  consequence,
  confirmLabel,
  pending,
  onConfirm,
  onDismiss,
}: {
  visible: boolean;
  title: string;
  meta: string;
  consequence: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.topBar} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>{meta}</Text>
          <Text style={styles.consequence}>{consequence}</Text>
          <Pressable
            style={[styles.button, styles.confirmButton]}
            onPress={onConfirm}
            disabled={pending}
            accessibilityRole="button"
          >
            {pending ? (
              <ActivityIndicator color={theme.destructive} />
            ) : (
              <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
            )}
          </Pressable>
          <Pressable style={[styles.button, styles.keepButton]} onPress={onDismiss} disabled={pending}>
            <Text style={styles.keepButtonText}>Buchung behalten</Text>
          </Pressable>
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
  },
  topBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 19, fontWeight: "800", color: theme.foreground },
  meta: { fontSize: 13, color: theme.mutedForeground, marginTop: 6 },
  consequence: { fontSize: 13, color: theme.foreground, marginTop: 10, lineHeight: 19 },
  button: { borderRadius: 10.5, paddingVertical: 14, alignItems: "center", marginTop: 18 },
  confirmButton: { borderWidth: 1.5, borderColor: theme.destructive },
  confirmButtonText: { color: theme.destructive, fontWeight: "700", fontSize: 15 },
  keepButton: { marginTop: 10 },
  keepButtonText: { color: theme.mutedForeground, fontWeight: "600", fontSize: 14 },
});
