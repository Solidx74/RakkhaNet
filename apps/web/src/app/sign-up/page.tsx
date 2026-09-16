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
import { cn } from "@/lib/utils";

const SELF_SIGNUP_ROLES = [
  {
    value: "citizen" as const,
    label: "Citizen",
    description: "Check risk, find shelter, request help",
  },
  {
    value: "volunteer" as const,
    label: "Volunteer",
    description: "Help coordinate relief on the ground",
  },
];

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"citizen" | "volunteer">("citizen");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.SubmitEvent) => {
    e.preventDefault();
    await authClient.signUp.email(
      { name, email, password, role },
      {
        onRequest: () => setLoading(true),
        onSuccess: () => {
          setLoading(false);
          router.push("/");
        },
        onError: (ctx) => {
          setLoading(false);
          toast.error(ctx.error.message ?? "Sign up failed");
        },
      },
    );
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col md:flex-row">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground md:flex">
        <div className="flex items-center gap-2">
          <Logo size={36} />
          <span className="text-xl font-semibold">RakkhaNet</span>
        </div>
        <div className="max-w-sm space-y-3">
          <h2 className="text-3xl font-semibold leading-tight">
            Join a platform built for Bangladesh&apos;s floods and cyclones.
          </h2>
          <p className="text-primary-foreground/80">
            Citizens, volunteers, and relief coordinators -- one account, the
            right view for your role.
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

      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 md:hidden">
            <Logo size={32} />
            <span className="text-lg font-semibold">RakkhaNet</span>
          </div>

          <h1 className="text-2xl font-semibold">Create an account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Takes less than a minute.
          </p>

          <form onSubmit={handleSignUp} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
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
                minLength={8}
              />
            </div>

            <div className="space-y-1.5">
              <Label>I am signing up as a...</Label>
              <div className="grid grid-cols-2 gap-2">
                {SELF_SIGNUP_ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={cn(
                      "rounded-lg border p-3 text-left text-sm transition-colors",
                      role === r.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "hover:border-primary/40",
                    )}
                  >
                    <span className="font-medium">{r.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {r.description}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Coordinators and administrators are added by an existing admin,
                not selected here.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Sign up"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
