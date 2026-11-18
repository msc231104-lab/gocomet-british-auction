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

export default function Sidebar({ onClose, isMobile = false }) {
  const pathname = usePathname();

  const isRouteActive = (href) => {
    if (href === "/") {
      return pathname === "/";
    }
    if (href === "/rfqs") {
      // Active if exactly /rfqs or any child path that is not /rfqs/new
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

  return (
    <div className="flex h-full flex-col justify-between bg-white text-slate-800">
      <div>
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            {/* Enterprise Logo Mark */}
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0c1a30] text-white shadow-xs">
              <span className="font-bold tracking-tight text-sm text-blue-400">GC</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 tracking-tight text-base">
                  GoComet
                </span>
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-800">
                  Auction
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500">
                Logistics RFQ Engine
              </p>
            </div>
          </Link>

          {isMobile && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              aria-label="Close navigation sidebar"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-4">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Procurement Menu
          </p>
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
                  className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                    active
                      ? "bg-blue-50 text-blue-900 font-semibold border-l-4 border-blue-700 shadow-xs"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-5 w-5 shrink-0 transition-colors ${
                        active ? "text-blue-700" : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>

                  {active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-700" aria-hidden="true" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Platform Meta Card */}
      <div className="p-4 border-t border-slate-200">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <ClockIcon className="h-3.5 w-3.5 text-blue-700" />
              British Reverse Auction
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Active
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
            Competitive reverse bidding with live clock auto-extension and lower-quote enforcement.
          </p>
        </div>
      </div>
    </div>
  );
}
