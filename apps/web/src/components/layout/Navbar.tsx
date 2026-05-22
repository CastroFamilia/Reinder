"use client";

/**
 * apps/web/src/components/layout/Navbar.tsx
 *
 * Main navigation bar for the buyer web experience.
 * Shows logo + nav links when authenticated, or logo + CTA when not.
 * Story 11.6
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavbarProps {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** User's display name */
  userName?: string | null;
  /** User's avatar URL */
  avatarUrl?: string | null;
  /** Number of new matches since last visit */
  newMatchCount?: number;
}

const navLinks = [
  { href: "/home", label: "Inicio", icon: "🏠" },
  { href: "/matches", label: "Matches", icon: "💜" },
  { href: "/profile", label: "Perfil", icon: "👤" },
];

export function Navbar({
  isAuthenticated,
  userName,
  avatarUrl,
  newMatchCount = 0,
}: NavbarProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: "var(--navbar-height)",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        background: scrolled
          ? "rgba(13, 13, 13, 0.85)"
          : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled
          ? "1px solid rgba(46, 40, 32, 0.4)"
          : "1px solid transparent",
        transition: "all 300ms ease",
      }}
    >
      <nav
        style={{
          maxWidth: "var(--max-width)",
          margin: "0 auto",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link
          href={isAuthenticated ? "/home" : "/"}
          style={{
            color: "#FF6B00",
            fontSize: "24px",
            fontWeight: 700,
            letterSpacing: "-0.5px",
            textDecoration: "none",
            fontFamily: "'Clash Display', 'Inter', system-ui, sans-serif",
          }}
        >
          Reinder
        </Link>

        {isAuthenticated ? (
          <>
            {/* Desktop nav links */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              className="nav-links-desktop"
            >
              {navLinks.map((link) => {
                const isActive = pathname === link.href || pathname?.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 16px",
                      borderRadius: "var(--radius-btn)",
                      fontSize: "14px",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#FF6B00" : "#9E9080",
                      background: isActive ? "rgba(255, 107, 0, 0.08)" : "transparent",
                      textDecoration: "none",
                      transition: "all 150ms ease",
                      position: "relative",
                    }}
                  >
                    <span style={{ fontSize: "16px" }}>{link.icon}</span>
                    {link.label}
                    {link.href === "/matches" && newMatchCount > 0 && (
                      <span
                        style={{
                          position: "absolute",
                          top: "2px",
                          right: "4px",
                          background: "#FF6B00",
                          color: "#0D0D0D",
                          fontSize: "10px",
                          fontWeight: 700,
                          minWidth: "18px",
                          height: "18px",
                          borderRadius: "999px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "0 4px",
                        }}
                      >
                        {newMatchCount > 99 ? "99+" : newMatchCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* User section */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <a
                href="https://reinder.app"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-secondary"
                style={{ display: "none" }}
                id="open-app-btn"
              >
                📱 Abrir app
              </a>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: avatarUrl ? `url(${avatarUrl}) center/cover` : "rgba(255, 107, 0, 0.15)",
                  border: "2px solid rgba(255, 107, 0, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FF6B00",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                {!avatarUrl && (userName ? userName.charAt(0).toUpperCase() : "U")}
              </div>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="nav-hamburger"
              style={{
                display: "none",
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                fontSize: "24px",
                cursor: "pointer",
                padding: "8px",
              }}
              aria-label="Menú de navegación"
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </>
        ) : (
          /* Not authenticated: CTA buttons */
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link
              href="/login"
              className="btn btn-ghost btn-sm"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="btn btn-primary btn-sm"
            >
              Regístrate gratis
            </Link>
          </div>
        )}
      </nav>

      {/* Mobile menu overlay */}
      {isAuthenticated && mobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            top: "var(--navbar-height)",
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(13, 13, 13, 0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            zIndex: 99,
          }}
        >
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "16px",
                  borderRadius: "var(--radius-btn)",
                  fontSize: "18px",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#FF6B00" : "#F5F0E8",
                  background: isActive ? "rgba(255, 107, 0, 0.08)" : "transparent",
                  textDecoration: "none",
                }}
              >
                <span style={{ fontSize: "20px" }}>{link.icon}</span>
                {link.label}
                {link.href === "/matches" && newMatchCount > 0 && (
                  <span className="badge badge-exclusive">{newMatchCount} nuevos</span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-links-desktop { display: none !important; }
          .nav-hamburger { display: block !important; }
          #open-app-btn { display: none !important; }
        }
        @media (min-width: 769px) {
          .nav-hamburger { display: none !important; }
          #open-app-btn { display: inline-flex !important; }
        }
      `}</style>
    </header>
  );
}
