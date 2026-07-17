import { getCurrentPlatformAdmin } from "@/lib/dal";
import { ThemeToggle } from "@/components/theme-toggle";
import { PlatformLogoutButton } from "@/components/platform/platform-logout-button";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentPlatformAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b bg-background px-4 sm:px-6">
        <span className="font-heading font-semibold">BEEPLUS Plattform</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {admin.firstName} {admin.lastName}
          </span>
          <ThemeToggle />
          <PlatformLogoutButton />
        </div>
      </header>
      <main className="flex-1 bg-muted/30 p-4 sm:p-6">{children}</main>
    </div>
  );
}
