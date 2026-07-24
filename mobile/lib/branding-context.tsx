import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getItem, setItem } from "./storage";
import { apiFetch } from "./api";
import { DEFAULT_PRIMARY_COLOR, DEFAULT_STUDIO_NAME } from "./theme";
import { useAuth } from "./auth-context";

const BRANDING_KEY = "beeplus_branding_cache";

export type Branding = { studioName: string; primaryColor: string; logoUrl: string | null };

const DEFAULT_BRANDING: Branding = {
  studioName: DEFAULT_STUDIO_NAME,
  primaryColor: DEFAULT_PRIMARY_COLOR,
  logoUrl: null,
};

const BrandingContext = createContext<Branding>(DEFAULT_BRANDING);

// Getrennt vom AuthProvider, aber davon abhaengig (braucht den Token) - so
// bleibt die Verantwortung klar getrennt: Auth verwaltet die Session,
// Branding nur die Optik. Wird direkt nach dem Login aus der verify-otp-
// Antwort befuellt und bei jedem App-Start per /api/mobile/branding
// aufgefrischt (falls das Studio die Farbe zwischenzeitlich geaendert hat).
export function BrandingProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);

  useEffect(() => {
    getItem(BRANDING_KEY).then((cached) => {
      if (cached) {
        try {
          setBranding(JSON.parse(cached));
        } catch {
          // korrupter Cache-Eintrag - beim naechsten Fetch ueberschrieben
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    apiFetch<Branding>("/api/mobile/branding", { token })
      .then((fresh) => {
        setBranding(fresh);
        setItem(BRANDING_KEY, JSON.stringify(fresh));
      })
      .catch(() => {
        // Netzwerkfehler: beim gecachten/Default-Branding bleiben statt
        // die UI mit einem Fehler zu blockieren - Branding ist Kosmetik,
        // kein kritischer Pfad.
      });
  }, [token]);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export function useBranding(): Branding {
  return useContext(BrandingContext);
}
