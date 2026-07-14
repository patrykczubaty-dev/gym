"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSocialApiSettings } from "@/server/actions/settings";

export function SocialApiForm({
  facebookPageId,
  facebookAccessToken,
  instagramBusinessAccountId,
  instagramAccessToken,
}: {
  facebookPageId: string | null;
  facebookAccessToken: string | null;
  instagramBusinessAccountId: string | null;
  instagramAccessToken: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateSocialApiSettings, undefined);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border bg-background p-4">
      <div>
        <h3 className="font-medium">Facebook</h3>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="facebookPageId">Facebook Page ID</Label>
            <Input id="facebookPageId" name="facebookPageId" defaultValue={facebookPageId ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facebookAccessToken">Facebook Access Token</Label>
            <Input
              id="facebookAccessToken"
              name="facebookAccessToken"
              type="password"
              autoComplete="off"
              defaultValue={facebookAccessToken ?? ""}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-medium">Instagram</h3>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="instagramBusinessAccountId">Instagram Business Account ID</Label>
            <Input
              id="instagramBusinessAccountId"
              name="instagramBusinessAccountId"
              defaultValue={instagramBusinessAccountId ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagramAccessToken">Instagram Access Token</Label>
            <Input
              id="instagramAccessToken"
              name="instagramAccessToken"
              type="password"
              autoComplete="off"
              defaultValue={instagramAccessToken ?? ""}
            />
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Diese Zugangsdaten werden bei der Veröffentlichung von News mit aktiviertem
        Facebook-/Instagram-Haken verwendet. Der tatsächliche API-Aufruf an Meta ist in diesem
        ersten Entwurf noch nicht angebunden — die Werte werden nur gespeichert.
      </p>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}
