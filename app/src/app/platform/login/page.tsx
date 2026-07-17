"use client";

import { useActionState } from "react";
import Link from "next/link";
import { platformLogin } from "@/server/actions/platform-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";

export default function PlatformLoginPage() {
  const [state, action, pending] = useActionState(platformLogin, undefined);

  return (
    <div className="flex min-h-screen flex-col p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="font-heading text-lg font-semibold">BEEPLUS Plattform</span>
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Plattform-Verwaltung</h1>
            <p className="text-sm text-muted-foreground">
              Nur für BEEPLUS-Betreiber — nicht für Gym-Mitarbeiter. Gym-Mitarbeiter melden sich
              unter <Link href="/login" className="underline">/login</Link> an.
            </p>
          </div>
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" required>
                E-Mail
              </Label>
              <Input id="email" name="email" type="email" autoComplete="username" required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" required>
                  Passwort
                </Label>
                <Link
                  href="/platform/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Passwort vergessen?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Anmelden…" : "Anmelden"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
