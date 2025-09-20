import type { User, ImpersonationContext, NavItem, AdminViewMode } from "./Navbar";

/**
 * Get navigation items based on user role and impersonation status
 */
export function getNavItems(
  user: User | undefined, 
  impersonation?: ImpersonationContext
): NavItem[] {
  // If no user, return empty navigation
  if (!user) {
    return [];
  }

  // If impersonating, always show user navigation
  if (impersonation?.isImpersonating) {
    return [
      { label: "Le mie simulazioni", href: "/dashboard/user/simulations", icon: "" },
      { label: "Le mie valutazioni", href: "/dashboard/user/evaluations", icon: "" },
    ];
  }

  // For admins, show admin navigation
  if (user.role === "admin") {
    return [
      { label: "Crea nuovo paziente", href: "/dashboard/admin/create-patient", icon: "" },
    ];
  } else {
    // Regular user - show user navigation
    return [
      { label: "Le mie simulazioni", href: "/dashboard/user/simulations", icon: "" },
      { label: "Le mie valutazioni", href: "/dashboard/user/evaluations", icon: "" },
    ];
  }
}
