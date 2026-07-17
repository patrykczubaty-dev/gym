// EXPO_PUBLIC_-Praefix wird von Expo automatisch zur Buildzeit inline
// ersetzt (siehe .env.example) - fuer den lokalen Simulator ist localhost
// bereits richtig (iOS-Simulator teilt den Host-Netzwerk-Stack), fuer ein
// echtes Geraet oder den Android-Emulator muss EXPO_PUBLIC_API_BASE_URL auf
// die LAN-IP bzw. 10.0.2.2 gesetzt werden.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";
