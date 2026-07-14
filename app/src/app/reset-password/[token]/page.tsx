"use client";

import { use, useActionState } from "react";
import Link from "next/link";
import { resetPassword } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const action = resetPassword.bind(null, token);
  const [state, formAction, pending] = useActionState(action, undefined);

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
              <h1 className="text-2xl font-semibold tracking-tight">Neues Passwort setzen</h1>
              <p className="text-sm text-muted-foreground">
                Bitte ein neues Passwort mit mindestens 8 Zeichen vergeben.
              </p>
            </div>
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Neues Passwort</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passwordConfirm">Passwort bestätigen</Label>
                <Input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Speichern…" : "Passwort speichern"}
              </Button>
            </form>
            <Link href="/login" className="block text-sm text-muted-foreground hover:text-foreground">
              Zurück zum Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
