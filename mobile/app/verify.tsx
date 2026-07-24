import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft } from "lucide-react-native";
import { useAuth } from "../lib/auth-context";
import { registerForPushNotifications } from "../lib/push";
import { ApiError } from "../lib/api";
import { theme, DEFAULT_PRIMARY_COLOR } from "../lib/theme";
import { brandGradient } from "../lib/color";
import { Label } from "../components/Label";

const gradientColors = brandGradient(DEFAULT_PRIMARY_COLOR);

// Muss zum Backend passen (MIN_RESEND_INTERVAL_MS in
// api/mobile/auth/request-otp/route.ts) - rein kosmetisch fuer den
// Countdown, das Backend bleibt die eigentliche Durchsetzung.
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const { verifyOtp, requestOtp } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

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
      setError(err instanceof ApiError ? err.message : "Etwas ist schiefgelaufen. Bitte versuche es erneut.");
    } finally {
      setPending(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setError(null);
    try {
      await requestOtp(email);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError("Code konnte nicht erneut gesendet werden.");
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => router.back()}
        style={styles.backButton}
        hitSlop={12}
        accessibilityLabel="Zurück zur E-Mail-Eingabe"
      >
        <ArrowLeft size={20} color={theme.foreground} />
      </Pressable>
      <Text style={styles.title}>Code eingeben</Text>
      <Text style={styles.subtitle}>Wir haben einen 6-stelligen Code an {email} gesendet.</Text>

      <Label>Code</Label>
      <TextInput
        style={styles.input}
        placeholder="000000"
        placeholderTextColor={theme.mutedForeground}
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable onPress={handleSubmit} disabled={pending}>
        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
          {pending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Anmelden</Text>}
        </LinearGradient>
      </Pressable>

      <Pressable onPress={handleResend} disabled={cooldown > 0}>
        <Text style={[styles.link, cooldown > 0 && styles.linkDisabled]}>
          {cooldown > 0 ? `Code erneut senden (${cooldown}s)` : "Code erneut senden"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12, backgroundColor: theme.background },
  backButton: {
    alignSelf: "flex-start",
    width: 40,
    height: 40,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.card,
    marginBottom: 4,
  },
  title: { fontSize: 26, fontWeight: "800", color: theme.foreground },
  subtitle: { fontSize: 14, color: theme.mutedForeground, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 26,
    letterSpacing: 8,
    textAlign: "center",
    backgroundColor: theme.card,
    color: theme.foreground,
  },
  error: { color: theme.destructive, fontSize: 13 },
  button: { borderRadius: 10.5, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  buttonText: { color: theme.primaryForeground, fontWeight: "700", fontSize: 16 },
  link: { color: DEFAULT_PRIMARY_COLOR, textAlign: "center", marginTop: 14, fontSize: 14, fontWeight: "600" },
  linkDisabled: { color: theme.mutedForeground },
});
