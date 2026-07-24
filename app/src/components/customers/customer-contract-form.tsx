"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { updateCustomerContract } from "@/server/actions/customers";
import { toDateInputValue, formatDateDe } from "@/lib/dates";
import { centsToEuros } from "@/lib/money";
import { FileText } from "lucide-react";

type Contract = {
  planId: string;
  termMonths: number;
  autoRenewalMonths: number;
  noticePeriodMonths: number;
  feeCents: number;
  debitOption: string;
  pausedFrom: Date | null;
  pausedTo: Date | null;
  cancellationReceivedAt: Date | null;
  contractEndDate: Date;
  cancellationPossibleUntil: Date;
  cancellationEffectiveAt: Date;
  autoRenewed: boolean;
};

type Customer = {
  id: string;
  status: string;
  joinedAt: Date;
  allLocations: boolean;
  locations: { city: string }[];
};

type ContractPlan = { id: string; name: string; weeklyLimit: number | null };

export function CustomerContractForm({
  customer,
  contract,
  contractPlans,
}: {
  customer: Customer;
  contract: Contract;
  contractPlans: ContractPlan[];
}) {
  const action = updateCustomerContract.bind(null, customer.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-6 rounded-lg border bg-background p-4">
      <div>
        <h3 className="mb-3 font-medium">Vertragsdetails</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Mitgliedschaft</Label>
            <RadioGroup name="status" defaultValue={customer.status} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="ACTIVE" id="status-active" />
                <Label htmlFor="status-active" className="font-normal">Aktiv</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="PAUSED" id="status-paused" />
                <Label htmlFor="status-paused" className="font-normal">Pausiert</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="INACTIVE" id="status-inactive" />
                <Label htmlFor="status-inactive" className="font-normal">Inaktiv</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="joinedAtDisplay">Beigetreten am</Label>
            <Input id="joinedAtDisplay" value={formatDateDe(customer.joinedAt)} disabled />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="locationDisplay">Am Standort</Label>
            <Input
              id="locationDisplay"
              value={customer.allLocations ? "Alle Standorte" : customer.locations.map((l) => l.city).join(", ")}
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="planId" required>
              Vertragsart
            </Label>
            <Select name="planId" defaultValue={contract.planId} required>
              <SelectTrigger id="planId" aria-label="Vertragsart" className="w-full">
                <SelectValue>
                  {(v: string) => contractPlans.find((p) => p.id === v)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {contractPlans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.weeklyLimit === null ? "Flatrate" : `${p.weeklyLimit}x/Woche`})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="termMonths">Laufzeit (Monate)</Label>
            <Input
              id="termMonths"
              name="termMonths"
              type="number"
              min={1}
              defaultValue={contract.termMonths}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="autoRenewalMonths">Automatische Verlängerung (Monate)</Label>
            <Input
              id="autoRenewalMonths"
              name="autoRenewalMonths"
              type="number"
              min={0}
              defaultValue={contract.autoRenewalMonths}
              required
            />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="mb-3 font-medium">Beitrag Abbuchung</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="feeEuros">Beitrag (€)</Label>
            <Input
              id="feeEuros"
              name="feeEuros"
              type="number"
              step="0.01"
              min={0}
              defaultValue={centsToEuros(contract.feeCents)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Abbuchungsoption</Label>
            <RadioGroup name="debitOption" defaultValue={contract.debitOption} className="flex gap-4 pt-1.5">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="MONTHLY" id="debit-monthly" />
                <Label htmlFor="debit-monthly" className="font-normal">monatlich</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="WEEKLY" id="debit-weekly" />
                <Label htmlFor="debit-weekly" className="font-normal">wöchentlich</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <div className="mb-3 flex items-center gap-2">
          <h3 className="font-medium">Ausfall / Kündigung</h3>
          {contract.autoRenewed && (
            <Badge variant="secondary">automatisch verlängert</Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="noticePeriodMonths">Kündigungsfrist (Monate vor Vertragsablauf)</Label>
            <Input
              id="noticePeriodMonths"
              name="noticePeriodMonths"
              type="number"
              min={0}
              defaultValue={contract.noticePeriodMonths}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cancellationPossibleUntilDisplay">Kündigung möglich bis</Label>
            <Input
              id="cancellationPossibleUntilDisplay"
              value={formatDateDe(contract.cancellationPossibleUntil)}
              disabled
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pausedFrom">Inaktiv von</Label>
            <Input
              id="pausedFrom"
              name="pausedFrom"
              type="date"
              defaultValue={toDateInputValue(contract.pausedFrom)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pausedTo">Inaktiv bis</Label>
            <Input
              id="pausedTo"
              name="pausedTo"
              type="date"
              defaultValue={toDateInputValue(contract.pausedTo)}
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cancellationReceivedAt">Kündigung Eingang</Label>
            <Input
              id="cancellationReceivedAt"
              name="cancellationReceivedAt"
              type="date"
              defaultValue={toDateInputValue(contract.cancellationReceivedAt)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cancellationEffectiveAtDisplay">Kündigung wirksam am</Label>
            <Input
              id="cancellationEffectiveAtDisplay"
              value={formatDateDe(contract.cancellationEffectiveAt)}
              disabled
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => toast.info("Kündigungs-PDF-Export folgt in einer späteren Ausbaustufe.")}
          >
            <FileText className="size-4" />
            Kündigung PDF
          </Button>
        </div>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}
