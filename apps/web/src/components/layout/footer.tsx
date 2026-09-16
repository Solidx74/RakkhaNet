import Link from "next/link";
import { Logo } from "@/components/logo";

const footerLinks = [
  { href: "/risk-map", label: "Risk Map" },
  { href: "/shelters", label: "Shelters" },
  { href: "/evacuation", label: "Evacuation" },
  { href: "/dashboard", label: "Relief Dashboard" },
];

export function Footer() {
  return (
    <footer className="border-t bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <Logo size={28} />
              <span className="font-semibold">RakkhaNet</span>
            </div>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              An AI-assisted disaster response and relief coordination platform
              for flood- and cyclone-prone Bangladesh.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Platform</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">About</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Built as a CSE-300 Software Development Project (Sessional) at
              Chittagong University of Engineering &amp; Technology (CUET).
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Risk data references official sources including BMD and FFWC.
              Always confirm critical decisions through official channels.
            </p>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} RakkhaNet. Not a replacement for official
          emergency services.
        </div>
      </div>
    </footer>
  );
}
