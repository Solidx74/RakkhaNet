"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { authClient } from "@/lib/auth-client";
import {
  fetchAdminUsers,
  updateUserRole,
  type AdminUser,
  type AdminUserRole,
} from "@/lib/api";

const ROLE_OPTIONS: { value: AdminUserRole; label: string }[] = [
  { value: "citizen", label: "Citizen" },
  { value: "volunteer", label: "Volunteer" },
  { value: "coordinator", label: "Coordinator" },
  { value: "admin", label: "Admin" },
];

const selectClass =
  "h-9 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export function UsersRolesPanel() {
  const { data: session } = authClient.useSession();
  const myId = session?.user?.id;

  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<AdminUserRole | "all">("all");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminUsers()
      .then((list) => {
        if (cancelled) return;
        setUsers(list);
        setLoadError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load users",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const visibleUsers = useMemo(
    () => (users ?? []).filter((u) => filter === "all" || u.role === filter),
    [users, filter],
  );

  function retry() {
    setUsers(null);
    setLoadError(null);
    setReloadKey((k) => k + 1);
  }

  async function handleRoleChange(user: AdminUser, newRole: AdminUserRole) {
    if (newRole === user.role) return;

    // Granting or removing admin is the highest-impact change on this page.
    if (newRole === "admin" || user.role === "admin") {
      const who = user.email ?? user.name ?? "this user";
      const ok = window.confirm(
        newRole === "admin"
          ? `Make ${who} an admin? Admins can create risk zones and shelters and change other users' roles.`
          : `Remove admin access from ${who}?`,
      );
      if (!ok) return;
    }

    setSavingId(user.id);
    try {
      const updated = await updateUserRole(user.id, newRole);
      setUsers((prev) =>
        prev
          ? prev.map((u) =>
              u.id === updated.id ? { ...u, role: updated.role } : u,
            )
          : prev,
      );
      toast.success(
        `${user.email ?? user.name ?? "User"} is now ${updated.role}`,
      );
    } catch (err) {
      // The select is controlled by user.role, so it snaps back on failure.
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">Users &amp; roles</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Change what each account can do. You can't change your own role. The
            list shows the 200 newest users.
          </p>
        </div>
        <select
          aria-label="Filter by role"
          className={selectClass}
          value={filter}
          onChange={(e) => setFilter(e.target.value as AdminUserRole | "all")}
        >
          <option value="all">All roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {loadError && (
        <div className="mt-4 text-sm">
          <p role="alert" className="text-destructive">
            {loadError}
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 inline-flex h-8 items-center rounded-md border px-3 text-sm"
          >
            Try again
          </button>
        </div>
      )}

      {!loadError && users === null && (
        <p className="mt-4 text-sm text-muted-foreground">Loading users…</p>
      )}

      {users && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Joined</th>
                <th className="py-2 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u) => {
                const isMe = u.id === myId;
                return (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      {u.name ?? "—"}
                      {isMe && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">{u.email ?? "—"}</td>
                    <td className="py-2 pr-4">{formatDate(u.createdAt)}</td>
                    <td className="py-2">
                      <select
                        aria-label={`Role for ${u.email ?? u.name ?? u.id}`}
                        className={selectClass}
                        value={u.role}
                        disabled={isMe || savingId === u.id}
                        onChange={(e) =>
                          handleRoleChange(u, e.target.value as AdminUserRole)
                        }
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
              {visibleUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-4 text-center text-muted-foreground"
                  >
                    No users with this role.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
