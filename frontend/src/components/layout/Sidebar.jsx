"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardIcon,
  RfqIcon,
  CreateRfqIcon,
  SupplierIcon,
  CloseIcon,
  ClockIcon,
  PinIcon,
} from "@/components/ui/Icons";

const navItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: DashboardIcon,
    description: "System overview & auction status",
  },
  {
    name: "RFQs",
    href: "/rfqs",
    icon: RfqIcon,
    description: "Active & completed freight tenders",
  },
  {
    name: "Create RFQ",
    href: "/rfqs/new",
    icon: CreateRfqIcon,
    description: "Configure new British reverse auction",
  },
  {
    name: "Suppliers",
    href: "/suppliers",
    icon: SupplierIcon,
    description: "Carrier directory & qualifications",
  },
];

export default function Sidebar({
  onClose,
  isMobile = false,
  isPinned = false,
  onTogglePin,
  isExpanded = true,
}) {
  const pathname = usePathname();

  const isRouteActive = (href) => {
    if (href === "/") {
      return pathname === "/";
    }
    if (href === "/rfqs") {
      return pathname === "/rfqs" || (pathname.startsWith("/rfqs/") && pathname !== "/rfqs/new");
    }
    if (href === "/rfqs/new") {
      return pathname === "/rfqs/new";
    }
    if (href === "/suppliers") {
      return pathname.startsWith("/suppliers");
    }
    return pathname === href;
  };

  // On desktop, labels are visually shown only when expanded
  const showLabels = isMobile || isExpanded;

  return (
    <div className="flex h-full flex-col justify-between bg-white text-slate-800 select-none">
      <div>
        {/* Brand Header */}
        <div className={`flex h-15 items-center border-b border-slate-200/90 px-3.5 ${showLabels ? "justify-between" : "justify-center"}`}>
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-2.5 rounded-xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-transform hover:scale-[1.02]"
            title="GoComet British Reverse Auction Platform"
          >
            {/* Enterprise Logo Mark */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0c1a30] text-white shadow-xs">
              <span className="font-bold tracking-tight text-sm text-blue-400">GC</span>
            </div>

            {showLabels && (
              <div className="overflow-hidden transition-opacity duration-150">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 tracking-tight text-sm">
                    GoComet
                  </span>
                  <span className="rounded-full bg-blue-50 border border-blue-200 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-blue-700">
                    Auction
                  </span>
                </div>
                <p className="text-[10px] font-medium text-slate-400 leading-tight">
                  Logistics RFQ Engine
                </p>
              </div>
            )}
          </Link>

          {/* Desktop Pin/Unpin Toggle Button */}
          {!isMobile && onTogglePin && showLabels && (
            <button
              type="button"
              onClick={onTogglePin}
              className={`rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors ${
                isPinned ? "text-blue-700 bg-blue-50 hover:bg-blue-100" : ""
              }`}
              title={isPinned ? "Unpin sidebar (collapse to icons)" : "Pin sidebar open"}
              aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar"}
              aria-pressed={isPinned}
            >
              <PinIcon className="h-4 w-4" isPinned={isPinned} />
            </button>
          )}

          {/* Mobile Close Button */}
          {isMobile && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              aria-label="Close navigation sidebar"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <div className="p-2.5">
          {showLabels ? (
            <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Procurement Menu
            </p>
          ) : (
            <div className="h-3" aria-hidden="true" />
          )}

          <nav className="space-y-1" aria-label="Main Navigation">
            {navItems.map((item) => {
              const active = isRouteActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  title={!showLabels ? item.name : undefined}
                  className={`group relative flex items-center rounded-xl text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                    showLabels ? "px-3 py-2.5 justify-between" : "p-2.5 justify-center"
                  } ${
                    active
                      ? "bg-blue-50/90 text-blue-900 font-semibold shadow-xs border border-blue-200/80"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  }`}
                >
                  <div className={`flex items-center ${showLabels ? "gap-3" : "justify-center"}`}>
                    <Icon
                      className={`h-5 w-5 shrink-0 transition-colors ${
                        active ? "text-blue-700" : "text-slate-400 group-hover:text-slate-700"
                      }`}
                    />
                    {showLabels ? (
                      <span className="truncate">{item.name}</span>
                    ) : (
                      <span className="sr-only">{item.name}</span>
                    )}
                  </div>

                  {active && (
                    <span
                      className={`${
                        showLabels
                          ? "h-1.5 w-1.5 rounded-full bg-blue-700"
                          : "absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-blue-700"
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Platform Meta Card / Status */}
      <div className="p-3 border-t border-slate-200/90">
        {showLabels ? (
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5">
                <ClockIcon className="h-3.5 w-3.5 text-blue-700" />
                British Reverse Auction
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Active
              </span>
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
              Descending bidding with auto-extension &amp; strict undercutting.
            </p>
          </div>
        ) : (
          <div
            className="flex items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-emerald-600"
            title="British Reverse Auction Engine Active"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="sr-only">British Reverse Auction Engine Active</span>
          </div>
        )}
      </div>
    </div>
  );
}
