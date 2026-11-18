"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon, PlusIcon, ShieldCheckIcon } from "@/components/ui/Icons";

const routeTitles = {
  "/": {
    section: "Dashboard",
    tagline: "Procurement Overview & Auction Monitoring",
  },
  "/rfqs": {
    section: "RFQs",
    tagline: "Freight Tender Management",
  },
  "/rfqs/new": {
    section: "Create RFQ",
    tagline: "British Reverse Auction Setup",
  },
  "/suppliers": {
    section: "Suppliers",
    tagline: "Carrier Network Directory",
  },
};

export default function Header({ onOpenMobileMenu }) {
  const pathname = usePathname();

  const currentRouteInfo = routeTitles[pathname] || {
    section: "Auction Workspace",
    tagline: "British Reverse Auction Management",
  };

  return (
    <header className="sticky top-0 z-30 flex h-15 w-full items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur-xs sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        {/* Mobile menu hamburger button */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="inline-flex items-center justify-center rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 md:hidden"
          aria-label="Open navigation sidebar"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        {/* Current Section & Breadcrumbs */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <span>Procurement</span>
            <span>/</span>
            <span className="font-semibold text-slate-900">
              {currentRouteInfo.section}
            </span>
          </div>
          <span className="hidden sm:inline text-[11px] text-slate-400 font-normal">
            {currentRouteInfo.tagline}
          </span>
        </div>
      </div>

      {/* Right Header Utilities */}
      <div className="flex items-center gap-2.5">
        {/* Status pill */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Auction Engine v1.0</span>
        </div>

        {/* Quick action button: New RFQ (hidden if already on /rfqs/new) */}
        {pathname !== "/rfqs/new" && (
          <Link
            href="/rfqs/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-700 hover:bg-blue-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            <span>Create RFQ</span>
          </Link>
        )}

        {/* User / Procurement Team Badge */}
        <div className="flex items-center gap-2 border-l border-slate-200/90 pl-2.5">
          <div className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-xs">
            GC
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-900 leading-tight">
              Freight Ops
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <ShieldCheckIcon className="h-2.5 w-2.5 text-blue-600" />
              Verified Enterprise
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
