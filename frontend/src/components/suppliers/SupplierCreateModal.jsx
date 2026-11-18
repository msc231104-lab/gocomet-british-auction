"use client";

import { useState, useEffect } from "react";
import { SupplierIcon, CloseIcon, PlusIcon, ClockIcon } from "@/components/ui/Icons";

export default function SupplierCreateModal({ isOpen, onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFieldError("");
    setServerError("");

    const trimmed = name.trim();

    // Client-side validation
    if (!trimmed) {
      setFieldError("Supplier name is required.");
      return;
    }

    if (trimmed.length > 255) {
      setFieldError("Supplier name cannot exceed 255 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ name: trimmed }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setServerError(
          json.error?.message || `Failed to register supplier (HTTP ${res.status}).`
        );
        setIsSubmitting(false);
        return;
      }

      // Success
      setIsSubmitting(false);
      onSuccess(json.data);
      onClose();
    } catch (err) {
      setServerError(
        err.message || "An unexpected error occurred while registering the supplier."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="supplier-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7 z-10 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9.5 w-9.5 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100/80">
              <SupplierIcon className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="supplier-modal-title"
                className="text-base font-bold text-slate-900 tracking-tight"
              >
                Register New Supplier
              </h2>
              <p className="text-xs text-slate-500">
                Enroll a verified freight carrier or logistics vendor
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50"
            aria-label="Close modal dialog"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Server-side Error Notice */}
        {serverError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800"
          >
            <p className="font-semibold text-rose-950">Registration Failed</p>
            <p className="mt-0.5">{serverError}</p>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="supplier-name-input"
                className="text-xs font-semibold text-slate-700"
              >
                Supplier / Carrier Name <span className="text-rose-600">*</span>
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                {name.trim().length} / 255
              </span>
            </div>

            <input
              type="text"
              id="supplier-name-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldError) setFieldError("");
              }}
              disabled={isSubmitting}
              autoFocus
              maxLength={255}
              placeholder="e.g., SafeExpress Freight Solutions Pvt Ltd"
              className={`w-full rounded-xl border bg-slate-50/40 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none transition-all ${
                fieldError
                  ? "border-rose-400 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
                  : "border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              } disabled:opacity-50`}
            />

            {fieldError ? (
              <p className="text-[11px] font-medium text-rose-600">
                {fieldError}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                Official business registration name of the trucking partner.
              </p>
            )}
          </div>

          {/* Guidelines Callout */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-[11px] text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">
              Procurement Verification Note
            </p>
            <p className="leading-relaxed text-slate-500">
              Registered suppliers can immediately participate in active British reverse auctions and place descending rate bids.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-700 px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <ClockIcon className="h-4 w-4 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <PlusIcon className="h-4 w-4" />
                  <span>Confirm Registration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
