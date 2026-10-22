import { RequireRole } from "@/components/auth/require-role";
import { CreateRiskZoneForm } from "@/components/admin/create-risk-zone-form";
import { CreateShelterForm } from "@/components/admin/create-shelter-form";
import { UsersRolesPanel } from "@/components/admin/users-roles-panel";

/**
 * Admin landing page: create-risk-zone (ADM-4), create-shelter (ADM-5) and
 * users & roles (ADM-6b).
 *
 * RequireRole is a UX gate, not the security boundary: every admin action
 * is still enforced server-side by requireRole("admin") on the API.
 */
export default function AdminPage() {
  return (
    <RequireRole roles={["admin"]}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tools for managing risk data, shelters, and users.
        </p>

        <div className="mt-6 space-y-4">
          <UsersRolesPanel />
          <CreateRiskZoneForm />
          <CreateShelterForm />
        </div>
      </div>
    </RequireRole>
  );
}
