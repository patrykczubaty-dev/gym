import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getItem, setItem, deleteItem } from "./storage";
import { apiFetch } from "./api";
import type { Customer, MeResponse } from "./types";

const TOKEN_KEY = "beeplus_customer_token";

type AuthState = {
  token: string | null;
  customer: Customer | null;
  isLoading: boolean;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<string>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getItem(TOKEN_KEY).then(async (stored) => {
      setToken(stored);
      // Nur der Token wird persistiert (siehe storage.ts) - beim App-Neustart
      // muss die Kundenidentitaet (fuer z.B. die Begruessung) separat
      // nachgeladen werden, sonst bleibt customer bis zum naechsten Login null.
      if (stored) {
        try {
          const me = await apiFetch<MeResponse>("/api/mobile/me", { token: stored });
          setCustomer({
            id: me.profile.id,
            firstName: me.profile.firstName,
            lastName: me.profile.lastName,
            email: me.profile.email,
            status: me.profile.status,
            contractType: me.profile.contractType,
          });
        } catch {
          // Token ungueltig/abgelaufen - Screens, die customer brauchen,
          // fangen den fehlenden Wert ab; ein harter Logout hier waere zu
          // aggressiv fuer einen einzelnen fehlgeschlagenen Request beim Start.
        }
      }
      setIsLoading(false);
    });
  }, []);

  async function requestOtp(email: string) {
    await apiFetch<{ message: string }>("/api/mobile/auth/request-otp", {
      method: "POST",
      body: { email },
    });
  }

  async function verifyOtp(email: string, code: string): Promise<string> {
    const result = await apiFetch<{ token: string; customer: Customer }>(
      "/api/mobile/auth/verify-otp",
      { method: "POST", body: { email, code } },
    );
    await setItem(TOKEN_KEY, result.token);
    setToken(result.token);
    setCustomer(result.customer);
    return result.token;
  }

  async function logout() {
    await deleteItem(TOKEN_KEY);
    setToken(null);
    setCustomer(null);
  }

  return (
    <AuthContext.Provider
      value={{ token, customer, isLoading, requestOtp, verifyOtp, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth muss innerhalb von AuthProvider verwendet werden.");
  return ctx;
}
