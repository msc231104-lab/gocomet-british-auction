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
    section: "Procurement Portal",
    tagline: "Freight Reverse Auction System",
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        {/* Mobile menu hamburger button */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 md:hidden"
          aria-label="Open navigation sidebar"
        >
          <MenuIcon className="h-6 w-6" />
        </button>

        {/* Current Section & Breadcrumbs */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>GoComet British Auction</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-800">
              {currentRouteInfo.section}
            </span>
          </div>
          <span className="hidden sm:inline text-xs text-slate-400">
            {currentRouteInfo.tagline}
          </span>
        </div>
      </div>

      {/* Right Header Utilities */}
      <div className="flex items-center gap-3">
        {/* Status pill */}
        <div className="hidden lg:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Auction Engine v1.0</span>
        </div>

        {/* Quick action button: New RFQ (hidden if already on /rfqs/new) */}
        {pathname !== "/rfqs/new" && (
          <Link
            href="/rfqs/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span className="hidden xs:inline">New RFQ</span>
          </Link>
        )}

        {/* User / Procurement Team Badge */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white shadow-xs">
            GC
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-900 leading-tight">
              Freight Ops
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
              <ShieldCheckIcon className="h-2.5 w-2.5 text-blue-600" />
              Verified Enterprise
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
