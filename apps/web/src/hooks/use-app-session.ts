"use client";

import { useEffect, useMemo } from "react";
import { authClient } from "@/lib/auth-client";

/**
 * Who is signed in -- and still "signed in" when the API can't be reached.
 *
 * Better Auth's useSession() asks the API on every page load. If the API is
 * down or the device is offline, it returns no session and an error, which
 * looks exactly like being signed out: protected pages bounce to "/" and the
 * navbar offers "Sign in", even though the session cookie is still valid.
 * This wraps it:
 *
 *  - Whenever the API confirms a session, a small snapshot (id, email, name,
 *    role -- no tokens) is kept on this device.
 *  - If the API cannot be reached (an error that isn't a 4xx answer) and a
 *    recent snapshot exists, that snapshot is used and `offline` is true.
 *  - If the API ANSWERS that there is no session, the snapshot is deleted:
 *    that is a real sign-out or an expired session.
 *
 * This only decides what the page shows. The API still checks the real
 * session on every request, so nothing here grants access to anything.
 */

const STORAGE_KEY = "rakkhanet:session:v1";
// Counted from the last time the API confirmed the session. Chosen to match
// a typical session lifetime; a very old snapshot shouldn't keep someone
// "signed in" on a device indefinitely.
const MAX_OFFLINE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface AppSessionUser {
  id: string;
  email: string;
  name: string | null;
  role?: string;
}

export interface AppSession {
  user: AppSessionUser;
}

interface Snapshot {
  user: AppSessionUser;
  savedAt: number;
}

function readSnapshot(): Snapshot | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p: unknown = JSON.parse(raw);
    if (typeof p !== "object" || p === null) return null;
    const { user, savedAt } = p as Record<string, unknown>;
    if (typeof savedAt !== "number") return null;
    if (Date.now() - savedAt > MAX_OFFLINE_AGE_MS) return null;
    if (typeof user !== "object" || user === null) return null;
    const u = user as Record<string, unknown>;
    if (typeof u.id !== "string" || !u.id) return null;
    if (typeof u.email !== "string" || !u.email) return null;
    return {
      user: {
        id: u.id,
        email: u.email,
        name: typeof u.name === "string" ? u.name : null,
        role: typeof u.role === "string" ? u.role : undefined,
      },
      savedAt,
    };
  } catch {
    return null;
  }
}

function writeSnapshot(user: AppSessionUser) {
  try {
    const snapshot: Snapshot = { user, savedAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage full or blocked (private mode): works while online, just
    // can't survive an offline reload.
  }
}

export function clearSessionSnapshot() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is blocked.
  }
}

/** A 4xx means the server answered; anything else means it didn't (or broke). */
function serverAnswered(error: { status?: number } | null): boolean {
  const status = error?.status;
  return typeof status === "number" && status >= 400 && status < 500;
}

export function useAppSession(): {
  data: AppSession | null;
  isPending: boolean;
  /** True when the session comes from this device's snapshot, not the API. */
  offline: boolean;
} {
  const { data, isPending, error } = authClient.useSession();

  const id = data?.user.id;
  const email = data?.user.email;
  const name = data?.user.name ?? null;
  const role = (data?.user as { role?: string } | undefined)?.role;

  useEffect(() => {
    if (id && email) {
      writeSnapshot({ id, email, name, role });
      return;
    }
    if (isPending) return;
    // The server answered "no session" (no error) or answered with a 4xx:
    // really signed out. An unreachable server (any other error) must NOT
    // clear it -- that's exactly when it is needed.
    if (!error || serverAnswered(error)) clearSessionSnapshot();
  }, [id, email, name, role, isPending, error]);

  // Memoised so the same session keeps the same object: consumers (e.g.
  // RequireRole's effect) must not see a "new" session on every render.
  return useMemo(() => {
    if (id && email) {
      return {
        data: { user: { id, email, name, role } },
        isPending,
        offline: false,
      };
    }
    if (isPending) return { data: null, isPending: true, offline: false };
    if (error && !serverAnswered(error)) {
      const snapshot = readSnapshot();
      if (snapshot) {
        return {
          data: { user: snapshot.user },
          isPending: false,
          offline: true,
        };
      }
    }
    return { data: null, isPending: false, offline: false };
  }, [id, email, name, role, isPending, error]);
}

/**
 * Sign out on the server, then forget this device's snapshot. If the server
 * can't be reached the session cannot really be ended (its cookie is
 * HttpOnly, so scripts can't remove it) -- so this reports failure and
 * changes nothing, rather than pretending the person is signed out.
 */
export async function signOutThisDevice(): Promise<boolean> {
  try {
    const result = await authClient.signOut();
    if (result?.error) return false;
  } catch {
    return false;
  }
  clearSessionSnapshot();
  return true;
}
