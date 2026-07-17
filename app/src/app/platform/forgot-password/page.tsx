"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPlatformPasswordReset } from "@/server/actions/platform-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft } from "lucide-react";

export default function PlatformForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPlatformPasswordReset, undefined);

  return (
    <div className="flex min-h-screen flex-col p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="font-heading text-lg font-semibold">BEEPLUS Plattform</span>
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Passwort vergessen</h1>
            <p className="text-sm text-muted-foreground">
              Gib deine Plattform-Admin-E-Mail-Adresse ein.
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
                <Label htmlFor="email" required>
                  E-Mail
                </Label>
                <Input id="email" name="email" type="email" autoComplete="username" required />
              </div>
              {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Wird gesendet…" : "Link anfordern"}
              </Button>
            </form>
          )}

          <Link
            href="/platform/login"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Zurück zum Login
          </Link>
        </div>
      </div>
    </div>
  );
}
