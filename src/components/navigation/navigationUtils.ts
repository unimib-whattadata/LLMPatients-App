import type { User, ImpersonationContext, NavItem, NavSection } from "~/types";
import { Search, Users, Map, FileText, UserPlus } from "lucide-react";

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
        title: "User Management",
        items: [
          {
            label: "User Management",
            href: "/admin/manage-users",
            icon: Users,
          },
        ],
      },
      {
        title: "Patient Management",
        items: [
          {
            label: "Patient Management",
            href: "/dashboard/patient",
            icon: UserPlus,
          },
          {
            label: "Assessment Schema",
            href: "/dashboard/patient/attributes",
            icon: FileText,
          },
        ],
      },
      {
        title: "Therapeutic Journey",
        items: [
          {
            label: "Explore Patients",
            href: "/explore-patients",
            icon: Search,
          },
          {
            label: "Therapeutic Journey",
            href: "/dashboard/therapeutic-journey",
            icon: Map,
          },
        ],
      },
    ];
  } else {
    
    return [
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      {
        title: "Therapeutic Journey",
        items: [
          {
            label: "Explore Patients",
            href: "/explore-patients",
            icon: Search,
          },
          {
            label: "Therapeutic Journey",
            href: "/dashboard/therapeutic-journey",
            icon: Map,
          },
        ],
      },
      {
        title: "Patient Management",
        items: [
          {
            label: "Patient Management",
            href: "/dashboard/patient",
            icon: UserPlus,
          },
          {
            label: "Assessment Schema",
            href: "/dashboard/patient/attributes",
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
