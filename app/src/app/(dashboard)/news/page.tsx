import Link from "next/link";
import { withGymScope } from "@/lib/scoped-prisma";
import { getCurrentEmployee } from "@/lib/dal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { NewsCreateDialog } from "@/components/news/news-create-dialog";
import { NewsRowActions } from "@/components/news/news-row-actions";
import { formatDateDe } from "@/lib/dates";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Entwurf",
  SENT: "Versendet",
  ARCHIVED: "Archiv",
};

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const { gymId } = await getCurrentEmployee();
  const [news, locations] = await withGymScope(gymId, (db) =>
    Promise.all([
      db.news.findMany({
        where: status ? { status } : undefined,
        orderBy: { createdAt: "desc" },
        include: { locations: true, attachments: true },
      }),
      db.location.findMany({ orderBy: { city: "asc" } }),
    ]),
  );

  const folders = [
    { key: undefined, label: "Alle" },
    { key: "SENT", label: "Versendet" },
    { key: "DRAFT", label: "Entwurf" },
    { key: "ARCHIVED", label: "Archiv" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">News</h1>
        <NewsCreateDialog locations={locations} />
      </div>

      <div className="flex flex-wrap gap-2">
        {folders.map((f) => (
          <Link
            key={f.label}
            href={f.key ? `/news?status=${f.key}` : "/news"}
            className={cn(
              "rounded-full border px-3 py-1.5 font-mono text-xs",
              status === f.key
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Betreff</TableHead>
              <TableHead className="hidden md:table-cell">Standorte</TableHead>
              <TableHead className="hidden lg:table-cell">Kanäle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Versendet am</TableHead>
              <TableHead className="w-24 text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {news.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="max-w-[9rem] font-medium whitespace-normal break-words sm:max-w-none">
                  <div className="flex items-center gap-2">
                    {item.attachments[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.attachments[0].url}
                        alt=""
                        className="size-8 shrink-0 rounded object-cover"
                      />
                    )}
                    <span>{item.subject}</span>
                  </div>
                  <div className="text-xs font-normal text-muted-foreground md:hidden">
                    {item.locations.length > 0
                      ? item.locations.map((l) => l.city).join(", ")
                      : "Alle Standorte"}
                  </div>
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {item.locations.length > 0
                    ? item.locations.map((l) => l.city).join(", ")
                    : "Alle Standorte"}
                </TableCell>
                <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                  {[
                    item.publishOnWebsite && "Website",
                    item.publishOnFacebook && "Facebook",
                    item.publishOnInstagram && "Instagram",
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    variant={
                      item.status === "SENT"
                        ? "success"
                        : item.status === "DRAFT"
                          ? "warning"
                          : "outline"
                    }
                  >
                    {STATUS_LABEL[item.status]}
                  </StatusBadge>
                </TableCell>
                <TableCell className="hidden font-mono text-muted-foreground sm:table-cell">
                  {item.sentAt ? formatDateDe(item.sentAt) : "—"}
                </TableCell>
                <TableCell>
                  <NewsRowActions id={item.id} status={item.status} />
                </TableCell>
              </TableRow>
            ))}
            {news.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Keine News vorhanden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
