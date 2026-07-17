import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "../lib/auth-context";
import { registerForPushNotifications } from "../lib/push";
import { ApiError } from "../lib/api";

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { verifyOtp, requestOtp } = useAuth();
  const router = useRouter();

  async function handleSubmit() {
    setError(null);
    if (code.length !== 6) {
      setError("Der Code besteht aus 6 Ziffern.");
      return;
    }
    setPending(true);
    try {
      const token = await verifyOtp(email, code);
      router.replace("/(tabs)");
      // Push-Registrierung blockiert die Navigation nicht - laeuft im
      // Hintergrund weiter (siehe registerForPushNotifications-Kommentar).
      void registerForPushNotifications(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Etwas ist schiefgelaufen.");
    } finally {
      setPending(false);
    }
  }

  async function handleResend() {
    setError(null);
    try {
      await requestOtp(email);
    } catch {
      setError("Code konnte nicht erneut gesendet werden.");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Code eingeben</Text>
      <Text style={styles.subtitle}>Wir haben einen 6-stelligen Code an {email} gesendet.</Text>

      <TextInput
        style={styles.input}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={handleSubmit} disabled={pending}>
        {pending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Anmelden</Text>}
      </Pressable>

      <Pressable onPress={handleResend}>
        <Text style={styles.link}>Code erneut senden</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: "600" },
  subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: "center",
  },
  error: { color: "#dc2626", fontSize: 13 },
  button: {
    backgroundColor: "#e2483d",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  link: { color: "#e2483d", textAlign: "center", marginTop: 12, fontSize: 14 },
});
