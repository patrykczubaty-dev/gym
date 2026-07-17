"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { updateGymBranding, resetGymBranding } from "@/server/actions/branding";
import { ensureReadableOnBackground } from "@/lib/core/contrast";
import { BRAND_DARK_SURFACE, DEFAULT_LOGIN_CLAIM, DEFAULT_PRIMARY_COLOR } from "@/lib/branding";

type LogoField = "logo" | "logoOnDark" | "logoOnLight";

function useFilePreview() {
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (field: LogoField, file: File | undefined) => {
    setPreviews((prev) => {
      if (prev[field]) URL.revokeObjectURL(prev[field]);
      const next = { ...prev };
      if (file) {
        next[field] = URL.createObjectURL(file);
      } else {
        delete next[field];
      }
      return next;
    });
  };

  return { previews, onChange };
}

export function BrandingForm({
  studioName,
  loginClaim,
  primaryColor,
  accentColor,
  logoUrl,
  logoOnDarkUrl,
  logoOnLightUrl,
}: {
  studioName: string;
  loginClaim: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
  logoOnDarkUrl: string | null;
  logoOnLightUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateGymBranding, undefined);
  const [resetState, resetAction, resetPending] = useActionState(resetGymBranding, undefined);

  const [name, setName] = useState(studioName);
  const [claim, setClaim] = useState(loginClaim ?? "");
  const [primary, setPrimary] = useState(primaryColor ?? DEFAULT_PRIMARY_COLOR);
  const [accent, setAccent] = useState(accentColor ?? "");
  const { previews, onChange } = useFilePreview();

  const previewLogo = previews.logo ?? previews.logoOnDark ?? logoOnDarkUrl ?? logoUrl;

  const validPrimary = /^#[0-9a-f]{6}$/i.test(primary) ? primary : DEFAULT_PRIMARY_COLOR;
  const { color: navTextColor, adjusted } = useMemo(
    () => ensureReadableOnBackground(validPrimary, BRAND_DARK_SURFACE),
    [validPrimary],
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
      <form action={formAction} className="space-y-6 rounded-lg border bg-background p-4">
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">Identität</h3>
            <p className="text-sm text-muted-foreground">
              Logo, Name und die Begrüßung auf dem Login-Screen.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="studioName">Studioname</Label>
            <Input
              id="studioName"
              name="studioName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Ersetzt „BEEPLUS“ in Titeln, Begrüßung und E-Mail-Texten.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <LogoFileField
              id="logo"
              name="logo"
              label="Logo"
              hint="SVG oder PNG, max. 5 MB. Favicon wird automatisch daraus erzeugt."
              currentUrl={previews.logo ?? logoUrl}
              onChange={(file) => onChange("logo", file)}
            />
            <LogoFileField
              id="logoOnDark"
              name="logoOnDark"
              label="Variante für dunkel (optional)"
              currentUrl={previews.logoOnDark ?? logoOnDarkUrl}
              onChange={(file) => onChange("logoOnDark", file)}
            />
            <LogoFileField
              id="logoOnLight"
              name="logoOnLight"
              label="Variante für hell (optional)"
              currentUrl={previews.logoOnLight ?? logoOnLightUrl}
              onChange={(file) => onChange("logoOnLight", file)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loginClaim">Login-Claim</Label>
            <Textarea
              id="loginClaim"
              name="loginClaim"
              rows={2}
              placeholder={DEFAULT_LOGIN_CLAIM}
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              Satz auf dem Login-Screen. Leer lassen für den Standardtext.
            </p>
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <div>
            <h3 className="font-medium">Farbe</h3>
            <p className="text-sm text-muted-foreground">
              Eine Markenfarbe — Hover-Ton, Hintergrund-Tint und aktive Zustände werden
              automatisch daraus abgeleitet.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primaryColorPicker">Primärfarbe</Label>
              <div className="flex items-center gap-2">
                <input
                  id="primaryColorPicker"
                  type="color"
                  value={validPrimary}
                  onChange={(e) => setPrimary(e.target.value)}
                  className="h-9 w-12 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0.5"
                  aria-label="Primärfarbe auswählen"
                />
                <Input
                  name="primaryColor"
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                  pattern="^#[0-9a-fA-F]{6}$"
                  required
                />
              </div>
              {adjusted && (
                <p className="text-xs text-muted-foreground">
                  Für Texte auf dunklem Grund verwenden wir eine hellere Variante deiner Farbe
                  (Kontrast-Mindestwert nicht erreicht).
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="accentColorPicker">Akzentfarbe (optional)</Label>
              <div className="flex items-center gap-2">
                <input
                  id="accentColorPicker"
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(accent) ? accent : "#766a62"}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-9 w-12 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0.5"
                  aria-label="Akzentfarbe auswählen"
                />
                <Input
                  name="accentColor"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  placeholder="ungesetzt"
                  pattern="^#[0-9a-fA-F]{6}$"
                />
              </div>
            </div>
          </div>
        </div>

        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Speichern…" : "Speichern"}
        </Button>
      </form>

      <Card className="lg:sticky lg:top-4">
        <CardHeader>
          <CardTitle>Vorschau</CardTitle>
          <CardDescription>Live, noch ungespeichert.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="space-y-3 rounded-lg p-3"
            style={{ backgroundColor: BRAND_DARK_SURFACE }}
          >
            {previewLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewLogo} alt={name} className="h-6 w-auto object-contain" />
            ) : (
              <span className="text-sm font-semibold text-white">{name}</span>
            )}
            <div
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium"
              style={{ backgroundColor: `${validPrimary}26`, color: navTextColor }}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: validPrimary }} />
              Aktiver Menüpunkt
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Aktive Mitglieder</p>
            <p className="text-xl font-semibold">128</p>
          </div>

          <button
            type="button"
            className="w-full rounded-md px-3 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: validPrimary }}
          >
            Beispiel-Button
          </button>

          <form action={resetAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={resetPending}
            >
              {resetPending ? "Wird zurückgesetzt…" : "Zurücksetzen auf Standard"}
            </Button>
            {resetState?.error && (
              <p className="mt-1 text-xs text-destructive">{resetState.error}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function LogoFileField({
  id,
  name,
  label,
  hint,
  currentUrl,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  currentUrl: string | null;
  onChange: (file: File | undefined) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {currentUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentUrl}
          alt=""
          className="h-8 w-auto max-w-full rounded border border-input bg-muted/40 object-contain p-1"
        />
      )}
      <Input
        id={id}
        name={name}
        type="file"
        accept="image/svg+xml,image/png,image/jpeg,image/webp"
        onChange={(e) => onChange(e.target.files?.[0])}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
