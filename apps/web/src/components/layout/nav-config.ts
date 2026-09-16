import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ClipboardList,
  Home,
  LayoutDashboard,
  MapPin,
  Route,
} from "lucide-react";

export type UserRole = "citizen" | "volunteer" | "coordinator" | "admin";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  // Which roles see this item. Undefined = everyone (including signed-out).
  roles?: UserRole[];
}

export const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/risk-map", label: "Risk Map", icon: AlertTriangle },
  { href: "/shelters", label: "Shelters", icon: MapPin },
  { href: "/evacuation", label: "Evacuation", icon: Route },
  {
    href: "/my-requests",
    label: "My Requests",
    icon: ClipboardList,
    // Listing all four roles (rather than omitting `roles`) means "any
    // logged-in user" -- a signed-out visitor (role: null) still won't see it.
    roles: ["citizen", "volunteer", "coordinator", "admin"],
  },
  {
    href: "/dashboard",
    label: "Relief Dashboard",
    icon: LayoutDashboard,
    roles: ["volunteer", "coordinator", "admin"],
  },
];

/** Filters nav items by role. Pass null/undefined for a signed-out visitor. */
export function visibleNavItems(role: UserRole | null | undefined): NavItem[] {
  return navItems.filter(
    (item) => !item.roles || (role && item.roles.includes(role)),
  );
}
