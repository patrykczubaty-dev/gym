import { platformLogout } from "@/server/actions/platform-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function PlatformLogoutButton() {
  return (
    <form action={platformLogout}>
      <Button variant="ghost" size="icon" title="Abmelden">
        <LogOut className="size-4" />
      </Button>
    </form>
  );
}
