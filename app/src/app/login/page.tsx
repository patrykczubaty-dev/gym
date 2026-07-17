import type { Metadata } from "next";
import { directPrisma } from "@/lib/prisma-direct";
import { resolveGymBranding, brandingStyleTag } from "@/lib/branding";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "@/components/login-form";

// Pre-Auth-Ausnahme (siehe prisma-direct.ts): welches Gym sich hier anmeldet
// ist per Definition noch nicht bekannt, daher ueber ein optionales
// `?gym=<slug>`-Query-Param aufgeloest statt ueber die (nicht existierende)
// Subdomain-pro-Gym-Route. Ohne Param oder bei unbekanntem Slug greift die
// generische BEEPLUS-Standardmarke. Mitarbeiter eines Gyms erhalten ihren
// personalisierten Login-Link vom Plattform-Admin beim Onboarding.
async function resolveLoginBranding(slug: string | undefined) {
  const gym = slug
    ? await directPrisma.gym.findUnique({
        where: { slug },
        select: {
          name: true,
          logoUrl: true,
          logoOnDarkUrl: true,
          logoOnLightUrl: true,
          faviconUrl: true,
          loginClaim: true,
          primaryColor: true,
          accentColor: true,
        },
      })
    : null;
  return resolveGymBranding(gym);
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ gym?: string }>;
}): Promise<Metadata> {
  const { gym: slug } = await searchParams;
  const branding = await resolveLoginBranding(slug);
  return {
    title: branding.studioName,
    ...(branding.faviconUrl ? { icons: { icon: branding.faviconUrl } } : {}),
  };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ gym?: string }>;
}) {
  const { gym: slug } = await searchParams;
  const branding = await resolveLoginBranding(slug);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* siehe (dashboard)/layout.tsx fuer die Begruendung von `precedence` ohne `href` */}
      <style precedence="high" dangerouslySetInnerHTML={{ __html: brandingStyleTag(branding) }} />
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, var(--primary) 0%, transparent 45%), radial-gradient(circle at 80% 80%, var(--primary) 0%, transparent 40%)",
          }}
        />
        <BrandLogo
          onDark
          priority
          className="relative h-9"
          studioName={branding.studioName}
          logoUrl={branding.logoUrl}
          logoOnDarkUrl={branding.logoOnDarkUrl}
        />
        <div className="relative space-y-3">
          <p className="text-2xl font-medium leading-snug text-balance">{branding.loginClaim}</p>
          <p className="text-sm text-sidebar-foreground/60">
            {branding.studioName} Studio-Backend für Standorte, Mitarbeiter und Kunden.
          </p>
        </div>
      </div>

      <div className="flex flex-col p-4 sm:p-6">
        <div className="flex items-center justify-between lg:justify-end">
          <BrandLogo
            priority
            className="h-8 lg:hidden"
            studioName={branding.studioName}
            logoUrl={branding.logoUrl}
            logoOnLightUrl={branding.logoOnLightUrl}
          />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">Willkommen zurück</h1>
              <p className="text-sm text-muted-foreground">
                Melde dich mit deinem Mitarbeiter-Zugang an.
              </p>
            </div>
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
