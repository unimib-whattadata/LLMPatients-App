import type {
  User,
  ImpersonationContext,
  NavItem,
  NavSection,
} from "./Navbar";
import {
  Search,
  Users,
  Map,
  FileText,
  UserPlus,
} from "lucide-react";

/**
 * Get navigation sections based on user role and impersonation status
 *
 * Returns appropriate navigation sections based on the user's role and whether
 * an admin is currently impersonating another user.
 *
 * @param user - Current user information
 * @param impersonation - Optional impersonation context for admin users
 * @returns Array of navigation sections with items
 */
export function getNavSections(
  user: User | undefined,
  impersonation?: ImpersonationContext,
): NavSection[] {
  // If no user, return empty navigation
  if (!user) {
    return [];
  }

  // If impersonating, always show user navigation
  if (impersonation?.isImpersonating) {
    return [];
  }

  // For admins, show admin navigation with separate sections
  if (user.role === "admin") {
    return [
      // Dashboard section hidden - contains Panoramica, Il Mio Profilo, La Mia Attività
      // {
      //   title: "Dashboard",
      //   items: [
      //     {
      //       label: "Panoramica",
      //       href: "/dashboard/user?section=overview",
      //       icon: Home,
      //     },
      //     {
      //       label: "Il Mio Profilo",
      //       href: "/dashboard/user?section=profile",
      //       icon: UserCircle,
      //     },
      //     {
      //       label: "La Mia Attività",
      //       href: "/dashboard/user?section=activities",
      //       icon: Clock,
      //     },
      //   ],
      // },
      {
        title: "Gestione Utenti",
        items: [
          {
            label: "Gestione Utenti",
            href: "/admin/manage-users",
            icon: Users,
          },
        ],
      },
      {
        title: "Gestione Pazienti",
        items: [
          {
            label: "Crea Paziente",
            href: "/dashboard/create-patient",
            icon: UserPlus,
          },
          {
            label: "Esplora Pazienti",
            href: "/explore-patients",
            icon: Search,
          },
          {
            label: "Percorso Terapeutico",
            href: "/dashboard/therapeutic-journey",
            icon: Map,
          },
          {
            label: "Schema Valutazione",
            href: "/dashboard/patient-attributes",
            icon: FileText,
          },
        ],
      },
    ];
  } else {
    // Regular user - show user navigation
    return [
      // Dashboard section hidden - contains Panoramica, Il Mio Profilo, La Mia Attività
      // {
      //   title: "Dashboard",
      //   items: [
      //     {
      //       label: "Panoramica",
      //       href: "/dashboard/user?section=overview",
      //       icon: Home,
      //     },
      //     {
      //       label: "Il Mio Profilo",
      //       href: "/dashboard/user?section=profile",
      //       icon: UserCircle,
      //     },
      //     {
      //       label: "La Mia Attività",
      //       href: "/dashboard/user?section=activities",
      //       icon: Clock,
      //     },
      //   ],
      // },
      {
        title: "Gestione Pazienti",
        items: [
          {
            label: "Esplora Pazienti",
            href: "/explore-patients",
            icon: Search,
          },
          {
            label: "Percorso Terapeutico",
            href: "/dashboard/therapeutic-journey",
            icon: Map,
          },
          {
            label: "Schema Valutazione",
            href: "/dashboard/patient-attributes",
            icon: FileText,
          },
        ],
      },
    ];
  }
}

/**
 * Get navigation items based on user role and impersonation status
 *
 * Legacy function for backward compatibility. Flattens navigation sections
 * into a single array of navigation items.
 *
 * @param user - Current user information
 * @param impersonation - Optional impersonation context for admin users
 * @returns Flattened array of navigation items
 */
export function getNavItems(
  user: User | undefined,
  impersonation?: ImpersonationContext,
): NavItem[] {
  const sections = getNavSections(user, impersonation);
  return sections.flatMap((section) => section.items);
}
