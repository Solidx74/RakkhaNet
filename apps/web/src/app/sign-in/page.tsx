"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.SubmitEvent) => {
    e.preventDefault();
    await authClient.signIn.email(
      { email, password },
      {
        onRequest: () => setLoading(true),
        onSuccess: () => {
          setLoading(false);
          router.push("/");
        },
        onError: (ctx) => {
          setLoading(false);
          toast.error(ctx.error.message ?? "Sign in failed");
        },
      },
    );
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col md:flex-row">
      {/* Brand panel -- desktop only */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground md:flex">
        <div className="flex items-center gap-2">
          <Logo size={36} />
          <span className="text-xl font-semibold">RakkhaNet</span>
        </div>
        <div className="max-w-sm space-y-3">
          <h2 className="text-3xl font-semibold leading-tight">
            Risk maps, shelters, and relief coordination -- built for when it
            matters most.
          </h2>
          <p className="text-primary-foreground/80">
            Sign in to check your area&apos;s risk, find the nearest shelter, or
            coordinate relief.
          </p>
        </div>
        <svg
          className="absolute inset-x-0 bottom-0 text-accent/20"
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 60 Q100 20 200 60 T400 60 V100 H0 Z"
            fill="currentColor"
          />
        </svg>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 md:hidden">
            <Logo size={32} />
            <span className="text-lg font-semibold">RakkhaNet</span>
          </div>

          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Welcome back.</p>

          <form onSubmit={handleSignIn} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link
              href="/sign-up"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
