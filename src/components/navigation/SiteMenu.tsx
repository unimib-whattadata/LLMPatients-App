"use client";

import { useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Menu, X } from "lucide-react";

interface SiteMenuLink {
  label: string;
  href: string;
  active?: boolean;
}

interface SiteMenuBrand {
  name: string;
  href?: string;
  logoSrc?: string;
  logoAlt?: string;
}

interface SiteMenuProps {
  variant?: "dark" | "light";
  brand: SiteMenuBrand;
  links: SiteMenuLink[];
  rightSlot?: ReactNode;
  mobileSlot?: ReactNode;
  containerClassName?: string;
  className?: string;
}

export function SiteMenu({
  variant = "light",
  brand,
  links,
  rightSlot,
  mobileSlot,
  containerClassName,
  className,
}: SiteMenuProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const resolvedLinks = useMemo(
    () =>
      links.map((link) => ({
        ...link,
        isActive:
          typeof link.active === "boolean"
            ? link.active
            : link.href !== "#" && pathname === link.href,
      })),
    [links, pathname],
  );

  const brandContent = (
    <>
      {brand.logoSrc ? (
        <Image
          src={brand.logoSrc}
          alt={brand.logoAlt ?? brand.name}
          className="site-menu__brand-logo image-auto-size"
          width={32}
          height={32}
          priority={true}
        />
      ) : (
        <div className="site-menu__brand-mark" aria-hidden="true" />
      )}
      <span className="site-menu__brand-name">{brand.name}</span>
    </>
  );

  const renderBrand = () => {
    if (brand.href) {
      return (
        <Link
          href={brand.href}
          className="site-menu__brand-link"
          onClick={() => setMobileOpen(false)}
        >
          {brandContent}
        </Link>
      );
    }
    return <div className="site-menu__brand-link">{brandContent}</div>;
  };

  const renderLinks = (isMobile = false) => (
    <ul
      className={isMobile ? "site-menu__mobile-list" : "site-menu__nav-list"}
      role="list"
    >
      {resolvedLinks.map((link, index) => (
        <li key={`${link.href}-${index}`} role="listitem">
          <Link
            href={link.href}
            className={`site-menu__link ${link.isActive ? "is-active" : ""}`}
            onClick={() => setMobileOpen(false)}
            aria-current={link.isActive ? "page" : undefined}
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  const combinedContainerClasses = ["site-menu__inner", "section-container"];
  if (containerClassName) combinedContainerClasses.push(containerClassName);

  return (
    <header
      className={`site-menu site-menu--${variant} ${mobileOpen ? "site-menu--open" : ""} ${className ?? ""}`}
    >
      <div className={combinedContainerClasses.join(" ")}>
        <div className="site-menu__brand">{renderBrand()}</div>

        <nav className="site-menu__nav" aria-label="Navigazione principale">
          {renderLinks()}
        </nav>

        <div className="site-menu__right">{rightSlot}</div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="site-menu__mobile-toggle"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Chiudi il menu" : "Apri il menu"}
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          <span className="sr-only">
            {mobileOpen ? "Chiudi il menu" : "Apri il menu"}
          </span>
          {mobileOpen ? (
            <X className="site-menu__mobile-icon" aria-hidden="true" />
          ) : (
            <Menu className="site-menu__mobile-icon" aria-hidden="true" />
          )}
        </Button>
      </div>

      <div className="site-menu__mobile" hidden={!mobileOpen}>
        <div className="section-container">
          {renderLinks(true)}
          {(mobileSlot ?? rightSlot) && (
            <div className="site-menu__mobile-extra">
              {mobileSlot ?? rightSlot}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
