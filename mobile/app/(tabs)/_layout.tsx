import { Redirect, Tabs } from "expo-router";
import { useAuth } from "../../lib/auth-context";

export default function TabsLayout() {
  const { token, isLoading } = useAuth();

  if (!isLoading && !token) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#e2483d" }}>
      <Tabs.Screen name="index" options={{ title: "Kurse" }} />
      <Tabs.Screen name="bookings" options={{ title: "Meine Buchungen" }} />
      <Tabs.Screen name="profile" options={{ title: "Profil" }} />
    </Tabs>
  );
}
