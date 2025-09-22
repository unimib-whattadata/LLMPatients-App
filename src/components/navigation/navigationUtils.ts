import type { User, ImpersonationContext, NavItem, NavSection, AdminViewMode } from "./Navbar";
import { 
  UserPlusIcon,
  PlayIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  HomeIcon,
  ChartBarIcon,
  UsersIcon,
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  UserCircleIcon,
  ClockIcon,
  MapIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

/**
 * Get navigation sections based on user role and impersonation status
 */
export function getNavSections(
  user: User | undefined, 
  impersonation?: ImpersonationContext
): NavSection[] {
  // If no user, return empty navigation
  if (!user) {
    return [];
  }

  // If impersonating, always show user navigation
  if (impersonation?.isImpersonating) {
    return [
      {
        title: "Simulazioni",
        items: [
          { label: "Le mie simulazioni", href: "/dashboard/user/simulations", icon: PlayIcon },
          { label: "Le mie valutazioni", href: "/dashboard/user/evaluations", icon: ClipboardDocumentListIcon },
        ]
      }
    ];
  }

  // For admins, show admin navigation with separate sections
  if (user.role === "admin") {
    return [
      {
        title: "Dashboard",
        items: [
          { label: "Panoramica", href: "/dashboard/admin", icon: HomeIcon },
          { label: "Registro Attività", href: "/dashboard/admin?section=activities", icon: ClockIcon },
        ]
      },
      {
        title: "Gestione Utenti",
        items: [
          { label: "Gestione Utenti", href: "/admin/manage-users", icon: UsersIcon },
        ]
      },
      {
        title: "Gestione Studenti",
        items: [
          { label: "Valutazioni Studenti", href: "/dashboard/admin/student-evaluations", icon: ClipboardDocumentCheckIcon },
          { label: "Statistiche Studenti", href: "/dashboard/admin/student-statistics", icon: ChartBarIcon },
        ]
      },
      {
        title: "Gestione Pazienti",
        items: [
          { label: "Esplora Pazienti", href: "/explore-patients", icon: MagnifyingGlassIcon },
          { label: "Percorso Terapeutico", href: "/therapeutic-journey", icon: MapIcon },
          { label: "Crea nuovo paziente", href: "/dashboard/admin/create-patient", icon: UserPlusIcon },
          { label: "Schema Valutazione", href: "/dashboard/patient-details", icon: DocumentTextIcon },
        ]
      }
    ];
  } else {
    // Regular user - show user navigation
    return [
      {
        title: "Dashboard",
        items: [
          { label: "Panoramica", href: "/dashboard/user?section=overview", icon: HomeIcon },
          { label: "Il Mio Profilo", href: "/dashboard/user?section=profile", icon: UserCircleIcon },
          { label: "La Mia Attività", href: "/dashboard/user?section=activities", icon: ClockIcon },
        ]
      },
      {
        title: "Simulazioni",
        items: [
          { label: "Le mie simulazioni", href: "/dashboard/user/simulations", icon: PlayIcon },
          { label: "Le mie valutazioni", href: "/dashboard/user/evaluations", icon: ClipboardDocumentListIcon },
        ]
      },
      {
        title: "Gestione Pazienti",
        items: [
          { label: "Esplora Pazienti", href: "/explore-patients", icon: MagnifyingGlassIcon },
          { label: "Percorso Terapeutico", href: "/therapeutic-journey", icon: MapIcon },
          { label: "Schema Valutazione", href: "/dashboard/patient-details", icon: DocumentTextIcon },
        ]
      }
    ];
  }
}

/**
 * Get navigation items based on user role and impersonation status (legacy function for backward compatibility)
 */
export function getNavItems(
  user: User | undefined, 
  impersonation?: ImpersonationContext
): NavItem[] {
  const sections = getNavSections(user, impersonation);
  return sections.flatMap(section => section.items);
}
