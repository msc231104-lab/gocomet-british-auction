"use client";

import { useState, useRef, useEffect, useSyncExternalStore, useCallback } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";

function subscribeToLocalStorage(callback) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getPinnedSnapshot() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("gocomet_sidebar_pinned") === "true";
  } catch {
    return false;
  }
}

function getServerPinnedSnapshot() {
  return false;
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Desktop collapsible sidebar states using useSyncExternalStore for hydration safety
  const isPinnedStored = useSyncExternalStore(
    subscribeToLocalStorage,
    getPinnedSnapshot,
    getServerPinnedSnapshot
  );
  const [pinnedOverride, setPinnedOverride] = useState(null);
  const isPinned = pinnedOverride !== null ? pinnedOverride : isPinnedStored;

  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const sidebarRef = useRef(null);

  const handleTogglePin = useCallback(() => {
    setPinnedOverride((prev) => {
      const current = prev !== null ? prev : isPinnedStored;
      const next = !current;
      try {
        localStorage.setItem("gocomet_sidebar_pinned", String(next));
        window.dispatchEvent(new Event("storage"));
      } catch {
        // Ignore localStorage error
      }
      return next;
    });
  }, [isPinnedStored]);

  // Close mobile drawer when route changes (React recommended pattern)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
  }

  // Handle ESC key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Desktop expanded condition: pinned OR hovered OR focused
  const isExpanded = isPinned || isHovered || isFocused;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Accessible Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 z-50 rounded-full bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        Skip to main content
      </a>

      {/* Desktop Collapsible Sidebar */}
      <aside
        ref={sidebarRef}
        aria-label="Sidebar navigation"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={(e) => {
          if (!sidebarRef.current?.contains(e.relatedTarget)) {
            setIsFocused(false);
          }
        }}
        className={`hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:flex-col border-r border-slate-200/90 bg-white transition-[width,box-shadow] duration-200 ease-in-out motion-reduce:transition-none ${
          isExpanded
            ? "w-[240px] shadow-xl"
            : "w-[72px]"
        }`}
      >
        <Sidebar
          isMobile={false}
          isPinned={isPinned}
          isExpanded={isExpanded}
          onTogglePin={handleTogglePin}
        />
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden transition-opacity"
          aria-hidden="true"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div
        aria-label="Mobile navigation drawer"
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          isMobile={true}
          isExpanded={true}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content Area: Responsive padding based on pinned state */}
      <div
        className={`flex flex-1 flex-col min-w-0 transition-[padding] duration-200 ease-in-out motion-reduce:transition-none ${
          isPinned ? "md:pl-[240px]" : "md:pl-[72px]"
        }`}
      >
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main
          id="main-content"
          className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 max-w-[1600px] w-full mx-auto"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
