"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Location = { id: string; city: string };

export function LocationMultiSelect({
  locations,
  defaultLocationIds,
  defaultAllLocations,
  showAllOption = true,
}: {
  locations: Location[];
  defaultLocationIds: string[];
  defaultAllLocations?: boolean;
  // Mitarbeiter kennen kein "Alle Standorte" (inkl. zukuenftiger) - das ist
  // ein Customer-spezifisches Konzept. Ohne diese Option ist "allLocations"
  // dauerhaft false und es wird kein entsprechendes Hidden-Field gerendert.
  showAllOption?: boolean;
}) {
  const [allLocations, setAllLocations] = useState(showAllOption && (defaultAllLocations ?? false));
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultLocationIds);

  function toggleLocation(id: string, checked: boolean) {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  const selectedCities = locations.filter((l) => selectedIds.includes(l.id)).map((l) => l.city);
  const summary = allLocations
    ? "Alle Standorte"
    : selectedCities.length === 0
      ? "Standort wählen"
      : selectedCities.join(", ");

  return (
    <>
      {/* Feste, gemeinsam ausgewertete Felder statt eines Einzel-locationId -
          kann mehreren Standorten zugeordnet sein oder (nur Kunden) pauschal
          "Alle Standorte" (auch zukuenftige) erhalten. */}
      {showAllOption && <input type="hidden" name="allLocations" value={allLocations ? "true" : "false"} />}
      {!allLocations &&
        selectedIds.map((id) => <input key={id} type="hidden" name="locationIds" value={id} />)}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" variant="outline" className="w-full justify-between font-normal" />}
        >
          <span className={cn("truncate text-left", selectedCities.length === 0 && !allLocations && "text-muted-foreground")}>
            {summary}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-(--anchor-width) min-w-56">
          {showAllOption && (
            <>
              <DropdownMenuCheckboxItem
                checked={allLocations}
                closeOnClick={false}
                onCheckedChange={(checked) => setAllLocations(Boolean(checked))}
              >
                Alle Standorte
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
            </>
          )}
          {locations.map((l) => (
            <DropdownMenuCheckboxItem
              key={l.id}
              checked={!allLocations && selectedIds.includes(l.id)}
              disabled={allLocations}
              closeOnClick={false}
              onCheckedChange={(checked) => toggleLocation(l.id, Boolean(checked))}
            >
              {l.city}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
