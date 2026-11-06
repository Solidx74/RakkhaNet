import { RequireRole } from "@/components/auth/require-role";
import { CreateRiskZoneForm } from "@/components/admin/create-risk-zone-form";
import { CreateShelterForm } from "@/components/admin/create-shelter-form";

/**
 * Coordinator tools: create risk zones and shelters. The forms are the same
 * ones the Admin page uses. RequireRole only decides who sees this page; the
 * real permission is on the API (POST /api/risk-zones and POST /api/shelters
 * accept coordinators and admins). Admins are let in too, in case they open
 * the address, but the menu only shows the link to coordinators.
 */
export default function CoordinatorPage() {
  return (
    <RequireRole roles={["coordinator", "admin"]}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Coordinator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create risk zones and shelters. A zone&apos;s level is worked out by
          the server (the AI model, or the rule-based fallback if the AI is
          unavailable).
        </p>

        <div className="mt-6 space-y-4">
          <CreateRiskZoneForm />
          <CreateShelterForm />
        </div>
      </div>
    </RequireRole>
  );
}
