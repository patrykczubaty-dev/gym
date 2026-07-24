import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../lib/auth-context";
import { theme } from "../lib/theme";

export default function Index() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.mutedForeground} />
      </View>
    );
  }

  return <Redirect href={token ? "/(tabs)" : "/login"} />;
}
