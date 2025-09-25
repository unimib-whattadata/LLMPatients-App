"use client";

import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Unified Breadcrumb Component
 * 
 * Provides consistent breadcrumb navigation across the application
 * with proper styling and accessibility features.
 * 
 * Features:
 * - Consistent styling with hover effects
 * - Proper color scheme for links and separators
 * - Accessibility support with ARIA labels
 * - Responsive design
 * 
 * @param items - Array of breadcrumb items
 * @param className - Optional additional CSS classes
 */
export function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <nav 
      className={`flex items-center space-x-2 text-sm text-text-tertiary mb-4 ${className}`}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => (
        <div key={item.label} className="flex items-center">
          {index > 0 && (
            <ChevronRightIcon className="w-4 h-4 text-text-quaternary mx-2" />
          )}
          
          {item.href && !item.isActive ? (
            <Link 
              href={item.href} 
              className="breadcrumb-link hover:text-text-secondary transition-colors duration-200"
            >
              {item.label}
            </Link>
          ) : (
            <span 
              className={`${
                item.isActive 
                  ? "text-text-primary font-medium" 
                  : "text-text-tertiary"
              }`}
            >
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
