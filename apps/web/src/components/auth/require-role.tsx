"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSession } from "@/hooks/use-app-session";

/**
 * Client-side route gate -- this is a UX convenience, NOT the security
 * boundary. The real enforcement is requireRole() on the Express API; even
 * if someone bypasses this component entirely, every actual data-fetching
 * request still gets rejected server-side. This just avoids showing a
 * confusing "half-loaded" page to someone in the wrong role.
 *
 * useAppSession() keeps the last signed-in account when the API can't be
 * reached, so a reload while offline doesn't bounce a signed-in person
 * to "/" as if they had signed out.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles: string[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isPending } = useAppSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  useEffect(() => {
    if (isPending) return;
    if (!session || !role || !roles.includes(role)) {
      router.replace("/");
    }
  }, [isPending, session, role, roles, router]);

  if (isPending || !session || !role || !roles.includes(role)) {
    return null;
  }
  return <>{children}</>;
}
