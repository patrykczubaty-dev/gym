"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "@/components/nav/nav-items";
import type { PermissionKey } from "@/lib/enums";
import { ChevronDown } from "lucide-react";

// Die ersten 3 Gruppen bleiben standardmäßig aufgeklappt, der Rest ist
// eingeklappt (Redesign-Vorschlag: weniger visuelles Rauschen beim Einstieg).
const DEFAULT_EXPANDED_GROUP_COUNT = 3;

export function SidebarNav({
  permissions,
  onNavigate,
}: {
  permissions: Record<PermissionKey, boolean>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(NAV_GROUPS.slice(DEFAULT_EXPANDED_GROUP_COUNT).map((g) => g.label)),
  );

  function toggleGroup(label: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_GROUPS.map((group) => {
        const visibleItems = group.items.filter(
          (item) =>
            !item.permission || permissions.permAdmin || permissions[item.permission],
        );
        if (visibleItems.length === 0) return null;

        const isOpen = !collapsed.has(group.label);

        return (
          <div key={group.label}>
            <button
              type="button"
              onClick={() => toggleGroup(group.label)}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 font-mono text-[10.5px] tracking-wider text-sidebar-foreground/40 uppercase transition-colors hover:text-sidebar-foreground/70"
            >
              {group.label}
              <ChevronDown
                className={cn(
                  "size-3 shrink-0 transition-transform duration-200",
                  isOpen ? "rotate-0" : "-rotate-90",
                )}
              />
            </button>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-200",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="flex flex-col gap-0.5 overflow-hidden">
              {visibleItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors",
                      isActive
                        ? "text-sidebar-foreground"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center",
                        isActive && "hex-clip bg-sidebar-primary",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-3.5",
                          isActive
                            ? "text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground",
                        )}
                      />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
