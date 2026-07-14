import { getCurrentEmployee } from "@/lib/dal";
import { SidebarNav } from "@/components/nav/sidebar-nav";
import { Topbar } from "@/components/nav/topbar";
import { BrandLogo } from "@/components/brand-logo";
import { PERMISSION_KEYS } from "@/lib/enums";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const employee = await getCurrentEmployee();

  const permissions = Object.fromEntries(
    PERMISSION_KEYS.map((key) => [key, employee[key]]),
  ) as Record<(typeof PERMISSION_KEYS)[number], boolean>;

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <BrandLogo onDark priority className="h-7" />
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
