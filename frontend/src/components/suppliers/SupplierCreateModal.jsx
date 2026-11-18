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
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7 z-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
              <SupplierIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 id="supplier-modal-title" className="text-base font-bold text-slate-900">
                Register New Supplier
              </h2>
              <p className="text-xs text-slate-500">
                Add a freight forwarder or carrier to the supplier directory
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50"
            aria-label="Close dialog"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-rose-900 text-xs flex items-start gap-2.5"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-rose-100 text-rose-700 mt-0.5">
              <CloseIcon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 space-y-0.5">
              <p className="font-semibold text-rose-950">Registration Failed</p>
              <p className="text-rose-800">{serverError}</p>
            </div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="supplier-name"
                className="text-xs font-semibold text-slate-700"
              >
                Supplier Name <span className="text-rose-600">*</span>
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                {name.trim().length} / 255
              </span>
            </div>

            <input
              type="text"
              id="supplier-name"
              name="supplier_name"
              maxLength={255}
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldError) setFieldError("");
                if (serverError) setServerError("");
              }}
              placeholder="e.g., Maersk Line Logistics, Apex Shipping Pvt Ltd"
              className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors ${
                fieldError
                  ? "border-rose-400 bg-rose-50/20 focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                  : "border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              }`}
            />

            {fieldError ? (
              <p className="text-[11px] font-medium text-rose-600">{fieldError}</p>
            ) : (
              <p className="text-[11px] text-slate-400">
                Official legal or operating entity name of the logistics provider.
              </p>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <ClockIcon className="h-3.5 w-3.5 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <PlusIcon className="h-3.5 w-3.5" />
                  <span>Register Supplier</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
