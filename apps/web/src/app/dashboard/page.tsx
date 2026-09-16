import { RequireRole } from "@/components/auth/require-role";

export default function DashboardPage() {
  return (
    <RequireRole roles={["volunteer", "coordinator", "admin"]}>
      <div>
        <h1 className="text-2xl font-semibold">
          Relief Coordination Dashboard
        </h1>
        <p className="text-muted-foreground">
          Phase 3 -- relief requests, assignment, live updates go here.
        </p>
      </div>
    </RequireRole>
  );
}
