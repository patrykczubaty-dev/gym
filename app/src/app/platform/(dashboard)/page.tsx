import { directPrisma } from "@/lib/prisma-direct";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { CreateGymDialog } from "@/components/platform/create-gym-dialog";
import { GymStatusToggle } from "@/components/platform/gym-status-toggle";
import { formatDateDe } from "@/lib/dates";

export default async function PlatformDashboardPage() {
  // directPrisma: ein Plattform-Admin darf/muss gymuebergreifende Zahlen
  // sehen (Standorte/Mitarbeiter/Kunden pro Gym) - RLS wuerde diese
  // Aggregation sonst wie jede andere gym-gebundene Tabelle blockieren.
  const gyms = await directPrisma.gym.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { customers: true, employees: true, locations: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Gyms</h1>
        <CreateGymDialog />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Standorte</TableHead>
              <TableHead className="hidden sm:table-cell">Mitarbeiter</TableHead>
              <TableHead className="hidden sm:table-cell">Kunden</TableHead>
              <TableHead className="hidden md:table-cell">Angelegt am</TableHead>
              <TableHead className="w-32 text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gyms.map((gym) => (
              <TableRow key={gym.id}>
                <TableCell className="font-medium">
                  <div>{gym.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{gym.slug}</div>
                </TableCell>
                <TableCell>
                  <StatusBadge variant={gym.status === "ACTIVE" ? "success" : "warning"}>
                    {gym.status === "ACTIVE" ? "aktiv" : "pausiert"}
                  </StatusBadge>
                </TableCell>
                <TableCell className="hidden font-mono sm:table-cell">
                  {gym._count.locations}
                </TableCell>
                <TableCell className="hidden font-mono sm:table-cell">
                  {gym._count.employees}
                </TableCell>
                <TableCell className="hidden font-mono sm:table-cell">
                  {gym._count.customers}
                </TableCell>
                <TableCell className="hidden font-mono text-muted-foreground md:table-cell">
                  {formatDateDe(gym.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <GymStatusToggle gymId={gym.id} status={gym.status} />
                </TableCell>
              </TableRow>
            ))}
            {gyms.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Noch keine Gyms angelegt.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
