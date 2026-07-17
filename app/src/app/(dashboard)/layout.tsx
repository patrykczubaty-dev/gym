import type { Metadata } from "next";
import { getCurrentEmployee, getCurrentGymBranding } from "@/lib/dal";
import { resolveGymBranding, brandingStyleTag } from "@/lib/branding";
import { SidebarNav } from "@/components/nav/sidebar-nav";
import { Topbar } from "@/components/nav/topbar";
import { BrandLogo } from "@/components/brand-logo";
import { PERMISSION_KEYS } from "@/lib/enums";

export async function generateMetadata(): Promise<Metadata> {
  const gym = await getCurrentGymBranding();
  const branding = resolveGymBranding(gym);
  return {
    title: { template: `%s — ${branding.studioName}`, default: branding.studioName },
    ...(branding.faviconUrl ? { icons: { icon: branding.faviconUrl } } : {}),
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const employee = await getCurrentEmployee();
  const gym = await getCurrentGymBranding();
  const branding = resolveGymBranding(gym);

  const permissions = Object.fromEntries(
    PERMISSION_KEYS.map((key) => [key, employee[key]]),
  ) as Record<(typeof PERMISSION_KEYS)[number], boolean>;

  return (
    <div className="flex min-h-screen flex-1">
      {/* `precedence` macht dies zu einer React-19-"Style Resource": React
          hoisted den Tag automatisch in <head> (statt an dieser DOM-Position
          zu rendern), was sowohl den Dev-Warnhinweis zu inline <style>-Tags
          vermeidet als auch zuverlässiger als globalCSS.css cascaded (siehe
          brandingStyleTag() in lib/branding.ts). Bewusst ohne `href`, da der
          Inhalt pro Request/Gym variiert und sonst über mehrere Requests
          hinweg dedupliziert/gecacht würde. */}
      <style precedence="high" dangerouslySetInnerHTML={{ __html: brandingStyleTag(branding) }} />
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <BrandLogo
            onDark
            priority
            className="h-7"
            studioName={branding.studioName}
            logoUrl={branding.logoUrl}
            logoOnDarkUrl={branding.logoOnDarkUrl}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav permissions={permissions} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar employee={employee} permissions={permissions} />
        <main className="min-w-0 flex-1 bg-muted/30 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
