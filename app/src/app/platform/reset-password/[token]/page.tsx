"use client";

import { use, useActionState } from "react";
import Link from "next/link";
import { resetPlatformPassword } from "@/server/actions/platform-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";

export default function PlatformResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const action = resetPlatformPassword.bind(null, token);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <div className="flex min-h-screen flex-col p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="font-heading text-lg font-semibold">BEEPLUS Plattform</span>
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
              <Label htmlFor="password" required>
                Neues Passwort
              </Label>
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
              <Label htmlFor="passwordConfirm" required>
                Passwort bestätigen
              </Label>
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
          <Link href="/platform/login" className="block text-sm text-muted-foreground hover:text-foreground">
            Zurück zum Login
          </Link>
        </div>
      </div>
    </div>
  );
}
