"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, var(--primary) 0%, transparent 45%), radial-gradient(circle at 80% 80%, var(--primary) 0%, transparent 40%)",
          }}
        />
        <BrandLogo onDark priority className="relative h-9" />
        <div className="relative space-y-3">
          <p className="text-2xl font-medium leading-snug text-balance">
            Mitglieder, Kurse und Verträge — alles an einem Ort.
          </p>
          <p className="text-sm text-sidebar-foreground/60">
            BEEPLUS Studio-Backend für Standorte, Mitarbeiter und Kunden.
          </p>
        </div>
      </div>

      <div className="flex flex-col p-4 sm:p-6">
        <div className="flex items-center justify-between lg:justify-end">
          <BrandLogo priority className="h-8 lg:hidden" />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">Passwort vergessen</h1>
              <p className="text-sm text-muted-foreground">
                Gib deine Mitarbeiter-E-Mail-Adresse ein, wir erstellen dir einen Link zum
                Zurücksetzen.
              </p>
            </div>

            {state && "success" in state ? (
              <div className="space-y-4">
                <p className="text-sm text-success">
                  Link wurde erstellt. E-Mail-Versand ist in diesem Entwurf noch nicht
                  angebunden — bitte den Link direkt öffnen:
                </p>
                <Link
                  href={state.resetUrl}
                  className="block truncate rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm text-primary hover:underline"
                >
                  {state.resetUrl}
                </Link>
              </div>
            ) : (
              <form action={action} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input id="email" name="email" type="email" autoComplete="username" required />
                </div>
                {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Wird gesendet…" : "Link anfordern"}
                </Button>
              </form>
            )}

            <Link
              href="/login"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Zurück zum Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
