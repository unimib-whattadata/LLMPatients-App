import type { User, ImpersonationContext, NavItem, NavSection } from "./Navbar";
import { Search, Users, Map, FileText, UserPlus, BookOpen } from "lucide-react";

export function getNavSections(
  user: User | undefined,
  impersonation?: ImpersonationContext,
): NavSection[] {
  
  if (!user) {
    return [];
  }

  
  if (impersonation?.isImpersonating) {
    return [];
  }

  
  if (user.role === "admin") {
    return [
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
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
          {
            label: "Patient Response Generator",
            href: "/docs/patient-response-generator",
            icon: BookOpen,
          },
        ],
      },
    ];
  } else {
    
    return [
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
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

export function getNavItems(
  user: User | undefined,
  impersonation?: ImpersonationContext,
): NavItem[] {
  const sections = getNavSections(user, impersonation);
  return sections.flatMap((section) => section.items);
}
