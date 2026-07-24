import { useState } from "react";
import { View, Text, Image, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../lib/auth-context";
import { ApiError } from "../lib/api";
import { theme, DEFAULT_PRIMARY_COLOR } from "../lib/theme";
import { brandGradient } from "../lib/color";
import { Label } from "../components/Label";

const gradientColors = brandGradient(DEFAULT_PRIMARY_COLOR);
const anselvoLogo = require("../assets/logo-anselvo.png");

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { requestOtp } = useAuth();
  const router = useRouter();

  async function handleSubmit() {
    setError(null);
    if (!email.includes("@")) {
      setError("Bitte eine gültige E-Mail-Adresse angeben.");
      return;
    }
    setPending(true);
    try {
      await requestOtp(email);
      router.push({ pathname: "/verify", params: { email } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Etwas ist schiefgelaufen. Bitte versuche es erneut.");
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={styles.container}>
      <Image source={anselvoLogo} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Willkommen zurück</Text>
      <Text style={styles.subtitle}>Melde dich mit deiner E-Mail-Adresse an.</Text>

      <Label>E-Mail-Adresse</Label>
      <TextInput
        style={styles.input}
        placeholder="name@beispiel.de"
        placeholderTextColor={theme.mutedForeground}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable onPress={handleSubmit} disabled={pending}>
        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
          {pending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Code anfordern</Text>}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12, backgroundColor: theme.background },
  logo: { width: 140, height: 25, alignSelf: "flex-start", marginBottom: 12 },
  title: { fontSize: 26, fontWeight: "800", color: theme.foreground },
  subtitle: { fontSize: 14, color: theme.mutedForeground, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: theme.card,
    color: theme.foreground,
  },
  error: { color: theme.destructive, fontSize: 13 },
  button: { borderRadius: 10.5, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  buttonText: { color: theme.primaryForeground, fontWeight: "700", fontSize: 16 },
});
