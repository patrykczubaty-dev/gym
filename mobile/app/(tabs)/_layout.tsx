import { Redirect, Tabs } from "expo-router";
import { Home, Dumbbell, PartyPopper, BarChart3, UserRound } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { useBranding } from "../../lib/branding-context";
import { theme } from "../../lib/theme";

export default function TabsLayout() {
  const { token, isLoading } = useAuth();
  const branding = useBranding();

  if (!isLoading && !token) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: branding.primaryColor,
        tabBarInactiveTintColor: theme.mutedForeground,
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.foreground,
        tabBarStyle: {
          backgroundColor: theme.cardElevated,
          borderTopColor: theme.border,
          height: 84,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Start",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: "Kurse",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <PartyPopper color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Statistik",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
