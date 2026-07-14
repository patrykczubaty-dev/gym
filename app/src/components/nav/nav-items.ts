import type { PermissionKey } from "@/lib/enums";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  MapPin,
  Users,
  UserRound,
  Dumbbell,
  CalendarDays,
  ClipboardList,
  Ticket,
  Newspaper,
  Mail,
  Landmark,
  BarChart3,
  Settings,
  BadgeEuro,
  PartyPopper,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  // permission === undefined bedeutet: für alle eingeloggten Mitarbeiter sichtbar
  permission?: PermissionKey;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// Gruppiert in 5 Kategorien statt einer langen Liste (Redesign-Vorschlag).
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Übersicht",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Mitglieder & Kurse",
    items: [
      { href: "/customers", label: "Kunden", icon: Users, permission: "permCustomers" },
      { href: "/courses", label: "Kurse", icon: Dumbbell, permission: "permCalendar" },
      { href: "/events", label: "Events", icon: PartyPopper, permission: "permCalendar" },
      { href: "/calendar", label: "Kalender", icon: CalendarDays, permission: "permCalendar" },
      {
        href: "/trials",
        label: "Probetrainings",
        icon: ClipboardList,
        permission: "permTrials",
      },
      { href: "/vouchers", label: "Gutscheine", icon: Ticket, permission: "permVouchers" },
      {
        href: "/contract-plans",
        label: "Vertragsarten",
        icon: BadgeEuro,
        permission: "permCustomers",
      },
    ],
  },
  {
    label: "Standorte & Team",
    items: [
      { href: "/locations", label: "Standorte", icon: MapPin },
      {
        href: "/employees",
        label: "Mitarbeiter",
        icon: UserRound,
        permission: "permEmployees",
      },
    ],
  },
  {
    label: "Kommunikation",
    items: [
      { href: "/news", label: "News", icon: Newspaper, permission: "permNews" },
      {
        href: "/email-templates",
        label: "E-Mail-Texte",
        icon: Mail,
        permission: "permEmailTemplates",
      },
    ],
  },
  {
    label: "Verwaltung",
    items: [
      {
        href: "/sepa",
        label: "SEPA-Zahlungseinzug",
        icon: Landmark,
        permission: "permSepa",
      },
      { href: "/stats/customers", label: "Statistiken", icon: BarChart3 },
      { href: "/settings", label: "Systeme", icon: Settings, permission: "permAdmin" },
    ],
  },
];

// Flache Liste, für Stellen die alle Items ohne Gruppierung brauchen.
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
