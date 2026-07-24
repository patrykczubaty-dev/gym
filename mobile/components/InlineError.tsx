import { View, Text, StyleSheet } from "react-native";
import { AlertCircle } from "lucide-react-native";
import { theme } from "../lib/theme";

// Ersetzt Alert.alert() fuer Ladefehler im Hintergrund: ein Fehler, der aus
// einem unaufgeforderten Datenabruf entsteht, sollte nicht dieselbe
// unterbrechende OS-Modal-Wucht haben wie das Ergebnis einer bewussten
// Nutzeraktion (Buchen/Stornieren) - dafuer bleibt Alert() richtig.
export function InlineError({ message }: { message: string }) {
  return (
    <View style={styles.container}>
      <AlertCircle size={16} color={theme.destructive} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.destructive + "1a",
    borderRadius: 10.5,
    padding: 12,
    margin: 16,
    marginBottom: 0,
  },
  text: { color: theme.destructive, fontSize: 13, flex: 1 },
});
