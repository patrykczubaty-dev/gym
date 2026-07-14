import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LocationDialog } from "@/components/locations/location-dialog";
import { DeleteLocationButton } from "@/components/locations/delete-location-button";

export default async function LocationsPage() {
  const locations = await prisma.location.findMany({
    orderBy: { city: "asc" },
    include: { _count: { select: { customers: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Standorte</h1>
        <LocationDialog />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ort</TableHead>
              <TableHead className="hidden sm:table-cell">Strasse</TableHead>
              <TableHead className="hidden sm:table-cell">PLZ</TableHead>
              <TableHead className="hidden lg:table-cell">Notizen</TableHead>
              <TableHead>Kunden</TableHead>
              <TableHead className="w-24 text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((location) => (
              <TableRow key={location.id}>
                <TableCell className="max-w-[9rem] font-medium whitespace-normal break-words sm:max-w-none">
                  <div>{location.city}</div>
                  <div className="text-xs font-normal text-muted-foreground sm:hidden">
                    {location.street}, {location.zip}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{location.street}</TableCell>
                <TableCell className="hidden font-mono sm:table-cell">{location.zip}</TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">
                  {location.notes ?? "—"}
                </TableCell>
                <TableCell className="font-mono">{location._count.customers}</TableCell>
                <TableCell className="flex justify-end gap-1">
                  <LocationDialog location={location} />
                  <DeleteLocationButton id={location.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
