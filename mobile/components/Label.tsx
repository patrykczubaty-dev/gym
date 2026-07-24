import { Text } from "react-native";
import { theme } from "../lib/theme";

// Persistentes Label statt Placeholder-als-Label: Placeholder verschwindet
// beim Tippen und wird von Screenreadern nicht zuverlaessig als
// Feldbeschriftung behandelt.
export function Label({ children }: { children: string }) {
  return (
    <Text style={{ fontSize: 13, fontWeight: "600", color: theme.mutedForeground, marginBottom: -4 }}>
      {children}
    </Text>
  );
}
