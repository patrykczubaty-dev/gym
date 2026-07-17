"use client";

import { useState } from "react";
import Link from "next/link";
import { logout } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { HexAvatar } from "@/components/ui/hex-avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { SidebarNav } from "@/components/nav/sidebar-nav";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { PermissionKey } from "@/lib/enums";
import { LogOut, Menu } from "lucide-react";

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export function Topbar({
  employee,
  permissions,
}: {
  employee: { firstName: string; lastName: string; email: string };
  permissions: Record<PermissionKey, boolean>;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b bg-background/95 px-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-4">
      <div className="flex items-center gap-1">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            title="Menü"
            aria-label="Navigationsmenü öffnen"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
            <SheetHeader className="border-b border-sidebar-border px-4 py-3">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <BrandLogo onDark className="h-7" />
            </SheetHeader>
            <SidebarNav permissions={permissions} onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>
        <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
          <BrandLogo className="h-6" />
        </Link>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <Link href="/profile" className="flex items-center gap-2 rounded-full pl-1 pr-1 hover:bg-muted sm:pr-3">
          <HexAvatar
            initials={initials(employee.firstName, employee.lastName)}
            className="size-7 bg-primary/10 text-primary"
          />
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {employee.firstName} {employee.lastName}
          </span>
        </Link>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="icon" title="Abmelden" aria-label="Abmelden">
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
