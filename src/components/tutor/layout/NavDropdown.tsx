import { UserAccountMenu } from "@/components/layout/UserAccountMenu";

/** Student shell — uses the shared account dropdown (same UX as teacher). */
export function NavDropdown() {
  return <UserAccountMenu variant="student" />;
}

