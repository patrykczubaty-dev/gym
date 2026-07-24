"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { HexAvatar } from "@/components/ui/hex-avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteCustomers } from "@/server/actions/customers";
import { formatDateDe } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { CONTRACT_TYPE_LABELS } from "@/lib/enums";
import { Trash2, Search } from "lucide-react";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  contractType: string;
  photoUrl: string | null;
  joinedAt: Date;
  allLocations: boolean;
  locations: { id: string; city: string }[];
};

function locationSummary(customer: Customer): string {
  if (customer.allLocations) return "Alle Standorte";
  return customer.locations.map((l) => l.city).join(", ") || "–";
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktiv",
  PAUSED: "Pausiert",
  INACTIVE: "Inaktiv",
};

const STATUS_VARIANT = {
  ACTIVE: "success",
  PAUSED: "warning",
  INACTIVE: "outline",
} as const;

const STATUS_FILTERS = ["ALLE", "ACTIVE", "PAUSED", "INACTIVE"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export function CustomersTable({
  customers,
  locations,
}: {
  customers: Customer[];
  locations: { id: string; city: string }[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALLE");
  const [locationFilter, setLocationFilter] = useState<string>("ALLE");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      ALLE: customers.length,
      ACTIVE: 0,
      PAUSED: 0,
      INACTIVE: 0,
    };
    for (const c of customers) {
      counts[c.status as StatusFilter] = (counts[c.status as StatusFilter] ?? 0) + 1;
    }
    return counts;
  }, [customers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (statusFilter !== "ALLE" && c.status !== statusFilter) return false;
      if (locationFilter !== "ALLE" && !c.allLocations && !c.locations.some((l) => l.id === locationFilter))
        return false;
      if (q && !`${c.firstName} ${c.lastName}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [customers, query, statusFilter, locationFilter]);

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleDelete() {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size} Kunden wirklich löschen?`)) return;
    startTransition(async () => {
      const result = await deleteCustomers(Array.from(selected));
      if (result?.error) toast.error(result.error);
      else setSelected(new Set());
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Kunden suchen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-full border px-3 py-1.5 font-mono text-xs whitespace-nowrap transition-colors",
              statusFilter === s
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {s === "ALLE" ? "Alle" : STATUS_LABEL[s]} · {statusCounts[s]}
          </button>
        ))}
        <Select value={locationFilter} onValueChange={(v) => setLocationFilter(v ?? "ALLE")}>
          <SelectTrigger className="ml-auto w-auto">
            <SelectValue>
              {(v: string) => (v === "ALLE" ? "Alle Standorte" : locations.find((l) => l.id === v)?.city)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALLE">Alle Standorte</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          disabled={selected.size === 0 || pending}
          onClick={handleDelete}
        >
          <Trash2 className="size-4" />
          Ausgewählte löschen
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Vorname, Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Vertragsart</TableHead>
              <TableHead className="hidden md:table-cell">Standort</TableHead>
              <TableHead className="hidden lg:table-cell">Eintrittsdatum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(customer.id)}
                    onCheckedChange={(checked) => toggle(customer.id, checked === true)}
                  />
                </TableCell>
                <TableCell className="max-w-[10rem] whitespace-normal sm:max-w-none">
                  <Link
                    href={`/customers/${customer.id}`}
                    className="flex items-center gap-2 font-medium hover:underline"
                  >
                    <HexAvatar
                      photoUrl={customer.photoUrl}
                      initials={`${customer.firstName[0]}${customer.lastName[0]}`}
                      className="size-7 text-xs"
                    />
                    <span>
                      <span className="block">
                        {customer.firstName} {customer.lastName}
                      </span>
                      <span className="block text-xs font-normal text-muted-foreground sm:hidden">
                        {CONTRACT_TYPE_LABELS[customer.contractType as keyof typeof CONTRACT_TYPE_LABELS]} · {locationSummary(customer)}
                      </span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <StatusBadge variant={STATUS_VARIANT[customer.status as keyof typeof STATUS_VARIANT]}>
                    {STATUS_LABEL[customer.status]}
                  </StatusBadge>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {CONTRACT_TYPE_LABELS[customer.contractType as keyof typeof CONTRACT_TYPE_LABELS]}
                </TableCell>
                <TableCell className="hidden md:table-cell">{locationSummary(customer)}</TableCell>
                <TableCell className="hidden font-mono text-muted-foreground lg:table-cell">
                  {formatDateDe(customer.joinedAt)}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Keine Kunden gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
