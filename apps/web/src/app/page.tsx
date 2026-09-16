import Link from "next/link";
import { AlertTriangle, MapPin, Route, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

const features = [
  {
    href: "/risk-map",
    icon: AlertTriangle,
    title: "Risk Map",
    description: "Check current flood and cyclone risk for your area.",
  },
  {
    href: "/shelters",
    icon: MapPin,
    title: "Shelter Locator",
    description: "Find the nearest open shelter and its current capacity.",
  },
  {
    href: "/evacuation",
    icon: Route,
    title: "Evacuation Guidance",
    description: "Get step-by-step directions to safety.",
  },
  {
    href: "/dashboard",
    icon: ShieldCheck,
    title: "Relief Coordination",
    description: "For volunteers and coordinators managing relief efforts.",
  },
];

export default function HomePage() {
  return (
    <div>
      <div className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="flex items-center gap-2">
            <Logo size={40} />
            <span className="text-xl font-semibold">RakkhaNet</span>
          </div>
          <h1 className="mt-8 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
            Know the risk. Find shelter. Coordinate relief.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-primary-foreground/80">
            An AI-assisted disaster response platform built for
            Bangladesh&apos;s floods and cyclones -- for the people at risk, and
            the volunteers and coordinators who respond.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link href="/risk-map">Check risk in your area</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link href="/shelters">Find a shelter</Link>
            </Button>
          </div>
        </div>
        <svg
          className="absolute inset-x-0 bottom-0 text-accent/20"
          viewBox="0 0 400 60"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 40 Q100 10 200 40 T400 40 V60 H0 Z" fill="currentColor" />
        </svg>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group rounded-lg border p-5 transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{feature.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
