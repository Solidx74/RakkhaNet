import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

/**
 * apps/web and apps/api are separately deployed (Vercel + Render), so we
 * can't type-import the server's `auth` instance directly -- that's the
 * pattern for same-project setups only. Instead we manually declare the
 * additional field(s) so `role` shows up on session.user with the right
 * type. Keep this in sync with the additionalFields in apps/api/src/auth.ts.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  plugins: [
    inferAdditionalFields({
      user: {
        role: { type: "string", input: true, required: false }, // must mirror auth.ts
      },
    }),
  ],
});

export const { useSession, signIn, signUp, signOut } = authClient;
