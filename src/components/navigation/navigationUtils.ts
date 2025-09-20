import type { User, ImpersonationContext, NavItem, AdminViewMode } from "./Navbar";
import { 
  UserPlusIcon,
  PlayIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  HomeIcon
} from "@heroicons/react/24/outline";

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
      { label: "Le mie simulazioni", href: "/dashboard/user/simulations", icon: PlayIcon },
      { label: "Le mie valutazioni", href: "/dashboard/user/evaluations", icon: ClipboardDocumentListIcon },
    ];
  }

  // For admins, show admin navigation
  if (user.role === "admin") {
    return [
      { label: "Crea nuovo paziente", href: "/dashboard/admin/create-patient", icon: UserPlusIcon },
    ];
  } else {
    // Regular user - show user navigation
    return [
      { label: "Le mie simulazioni", href: "/dashboard/user/simulations", icon: PlayIcon },
      { label: "Le mie valutazioni", href: "/dashboard/user/evaluations", icon: ClipboardDocumentListIcon },
    ];
  }
}
