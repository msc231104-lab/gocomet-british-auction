"use client";

import Link from "next/link";

export default function ErrorBanner({ error, onRetry, title = "Backend Connection Error" }) {
  const message = typeof error === "string" ? error : error?.message || "An unexpected error occurred.";

  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-200 bg-rose-50/80 p-5 text-rose-900 shadow-xs"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
        </div>

        <div className="flex-1 space-y-1">
          <h3 className="text-sm font-bold text-rose-950">
            {title}
          </h3>
          <p className="text-xs text-rose-800 leading-relaxed">
            {message}
          </p>

          <div className="mt-3 flex items-center gap-3 pt-1">
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
              >
                <span>Retry Connection</span>
              </button>
            ) : (
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
              >
                <span>Refresh Page</span>
              </Link>
            )}

            <span className="text-[11px] text-rose-600">
              Verify backend service status at <code className="font-mono font-semibold">http://localhost:8000/health</code>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
