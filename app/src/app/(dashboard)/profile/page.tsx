import { getCurrentEmployee } from "@/lib/dal";
import { HexAvatar } from "@/components/ui/hex-avatar";
import { ChangePasswordForm } from "@/components/profile/change-password-form";

export default async function ProfilePage() {
  const employee = await getCurrentEmployee();

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Mein Profil</h1>
      <div className="flex items-center gap-3 rounded-lg border bg-background p-4">
        <HexAvatar
          photoUrl={employee.photoUrl}
          initials={`${employee.firstName[0]}${employee.lastName[0]}`}
          className="size-12"
        />
        <div>
          <div className="font-medium">
            {employee.firstName} {employee.lastName}
          </div>
          <div className="text-sm text-muted-foreground">{employee.email}</div>
        </div>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
