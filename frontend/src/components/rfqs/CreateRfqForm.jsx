"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getUserTimezone,
  toTimezoneAwareISO,
} from "@/lib/formatters";
import {
  RfqIcon,
  ClockIcon,
  ShieldCheckIcon,
  PlusIcon,
  InfoIcon,
  CheckCircleIcon,
} from "@/components/ui/Icons";

const SERVER_TIMEZONE = {
  name: "UTC",
  offset: "+00:00",
  formatted: "UTC (+00:00)",
};

let cachedClientTimezone = null;
function getClientTimezoneSnapshot() {
  if (!cachedClientTimezone && typeof window !== "undefined") {
    cachedClientTimezone = getUserTimezone();
  }
  return cachedClientTimezone || SERVER_TIMEZONE;
}

function getServerTimezoneSnapshot() {
  return SERVER_TIMEZONE;
}

function subscribeToTimezone() {
  return () => {};
}

const EXTENSION_TRIGGERS = [
  {
    value: "ANY_BID",
    label: "Any Bid (ANY_BID)",
    description: "Every qualifying descending bid placed within the trigger window extends the countdown.",
  },
  {
    value: "ANY_RANK_CHANGE",
    label: "Any Rank Change (ANY_RANK_CHANGE)",
    description: "Any bid that shifts the supplier leaderboard ranks extends the countdown.",
  },
  {
    value: "L1_CHANGE",
    label: "L1 Change (L1_CHANGE)",
    description: "Only bids capturing the #1 lowest price rank extend the countdown.",
  },
];

export default function CreateRfqForm() {
  const router = useRouter();

  // Form State
  const [formData, setFormData] = useState({
    reference_id: "",
    name: "",
    bid_start_at: "",
    initial_close_at: "",
    forced_close_at: "",
    pickup_at: "",
    trigger_window_minutes: "5",
    extension_minutes: "3",
    extension_trigger: "ANY_BID",
  });

  // Validation & Submission State
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // User Local Timezone using React useSyncExternalStore for hydration and prerender safety
  const timezoneInfo = useSyncExternalStore(
    subscribeToTimezone,
    getClientTimezoneSnapshot,
    getServerTimezoneSnapshot
  );

  // Handle Input Changes
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (formError) {
      setFormError(null);
    }
  };

  // Comprehensive Client-side Form Validation
  const validateForm = () => {
    const errors = {};

    // Reference ID
    const ref = formData.reference_id.trim();
    if (!ref) {
      errors.reference_id = "Reference ID is required";
    } else if (ref.length > 100) {
      errors.reference_id = "Reference ID cannot exceed 100 characters";
    }

    // RFQ Name
    const name = formData.name.trim();
    if (!name) {
      errors.name = "RFQ name is required";
    } else if (name.length > 255) {
      errors.name = "RFQ name cannot exceed 255 characters";
    }

    // Datetimes Presence
    if (!formData.bid_start_at) {
      errors.bid_start_at = "Bid start date/time is required";
    }
    if (!formData.initial_close_at) {
      errors.initial_close_at = "Initial close date/time is required";
    }
    if (!formData.forced_close_at) {
      errors.forced_close_at = "Forced close date/time is required";
    }
    if (!formData.pickup_at) {
      errors.pickup_at = "Pickup date/time is required";
    }

    // Chronological Date Rules Validation
    if (
      formData.bid_start_at &&
      formData.initial_close_at &&
      formData.forced_close_at
    ) {
      const start = new Date(formData.bid_start_at).getTime();
      const initialClose = new Date(formData.initial_close_at).getTime();
      const forcedClose = new Date(formData.forced_close_at).getTime();

      if (initialClose <= start) {
        errors.initial_close_at =
          "Initial close must be strictly after bid start time";
      }

      if (forcedClose <= initialClose) {
        errors.forced_close_at =
          "Forced close deadline must be strictly after initial close time";
      }
    }

    if (formData.pickup_at && formData.bid_start_at) {
      const start = new Date(formData.bid_start_at).getTime();
      const pickup = new Date(formData.pickup_at).getTime();

      if (pickup <= start) {
        errors.pickup_at = "Cargo pickup must be strictly after bid start time";
      }
    }

    // Numeric Window Validations
    const triggerWindow = parseInt(formData.trigger_window_minutes, 10);
    if (isNaN(triggerWindow) || triggerWindow <= 0) {
      errors.trigger_window_minutes =
        "Trigger window must be a positive integer greater than 0";
    }

    const extensionMins = parseInt(formData.extension_minutes, 10);
    if (isNaN(extensionMins) || extensionMins <= 0) {
      errors.extension_minutes =
        "Extension duration must be a positive integer greater than 0";
    }

    // Extension Trigger Enum
    const validTriggers = ["ANY_BID", "ANY_RANK_CHANGE", "L1_CHANGE"];
    if (!validTriggers.includes(formData.extension_trigger)) {
      errors.extension_trigger = "Please select a supported extension trigger";
    }

    return errors;
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Please resolve the highlighted validation errors before submitting.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);

    try {
      // Build Timezone-Aware Payload
      const payload = {
        reference_id: formData.reference_id.trim(),
        name: formData.name.trim(),
        bid_start_at: toTimezoneAwareISO(
          formData.bid_start_at,
          timezoneInfo.offset
        ),
        initial_close_at: toTimezoneAwareISO(
          formData.initial_close_at,
          timezoneInfo.offset
        ),
        forced_close_at: toTimezoneAwareISO(
          formData.forced_close_at,
          timezoneInfo.offset
        ),
        pickup_at: toTimezoneAwareISO(
          formData.pickup_at,
          timezoneInfo.offset
        ),
        trigger_window_minutes: parseInt(formData.trigger_window_minutes, 10),
        extension_minutes: parseInt(formData.extension_minutes, 10),
        extension_trigger: formData.extension_trigger,
      };

      const res = await fetch("/api/rfqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        if (res.status === 409) {
          setFieldErrors((prev) => ({
            ...prev,
            reference_id: "An RFQ with this Reference ID already exists in the system.",
          }));
          setFormError("Reference ID conflict: An RFQ with this reference ID already exists.");
        } else if (res.status === 422) {
          setFormError(
            json.error?.message ||
              "Backend validation rejected this payload. Please review date chronological order."
          );
        } else {
          setFormError(
            json.error?.message ||
              `Failed to create RFQ (HTTP ${res.status}). Please check backend status.`
          );
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      setSuccessMessage(
        `RFQ "${json.data?.name || payload.name}" created successfully! Redirecting to live auction workspace...`
      );

      setTimeout(() => {
        if (json.data?.id) {
          router.push(`/rfqs/${json.data.id}`);
        } else {
          router.push("/rfqs");
        }
      }, 1200);
    } catch (err) {
      setFormError(
        err.message || "Network error: Failed to connect to internal RFQ proxy."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Top Banner Alert: Form-level Error */}
      {formError && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-rose-900 shadow-xs flex items-start gap-3"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
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
          <div className="flex-1">
            <h3 className="text-sm font-bold text-rose-950">Creation Error</h3>
            <p className="mt-0.5 text-xs text-rose-800 leading-relaxed">{formError}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-900 shadow-xs flex items-start gap-3"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <CheckCircleIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-emerald-950">Success</h3>
            <p className="mt-0.5 text-xs text-emerald-800 leading-relaxed">{successMessage}</p>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION A: RFQ Information
          ========================================================================= */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100/80">
            <RfqIcon className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Section A: RFQ Identification
            </h2>
            <p className="text-[11px] text-slate-400">
              Unique reference code and descriptive tender name
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Reference ID */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="reference_id"
                className="text-xs font-semibold text-slate-700"
              >
                Reference ID <span className="text-rose-600">*</span>
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                {formData.reference_id.trim().length} / 100
              </span>
            </div>
            <input
              type="text"
              id="reference_id"
              name="reference_id"
              maxLength={100}
              value={formData.reference_id}
              onChange={(e) => handleChange("reference_id", e.target.value)}
              placeholder="e.g., RFQ-2026-MUM-PUN-01"
              className={`w-full rounded-xl border bg-slate-50/40 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 font-mono focus:bg-white focus:outline-none transition-all ${
                fieldErrors.reference_id
                  ? "border-rose-400 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
                  : "border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              }`}
            />
            {fieldErrors.reference_id ? (
              <p className="text-[11px] font-medium text-rose-600">
                {fieldErrors.reference_id}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                Unique identifier for tracking across procurement and billing records.
              </p>
            )}
          </div>

          {/* RFQ Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="name"
                className="text-xs font-semibold text-slate-700"
              >
                RFQ Name <span className="text-rose-600">*</span>
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                {formData.name.trim().length} / 255
              </span>
            </div>
            <input
              type="text"
              id="name"
              name="name"
              maxLength={255}
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g., Mumbai to Pune FTL Dry Van Freight Auction"
              className={`w-full rounded-xl border bg-slate-50/40 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none transition-all ${
                fieldErrors.name
                  ? "border-rose-400 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
                  : "border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              }`}
            />
            {fieldErrors.name ? (
              <p className="text-[11px] font-medium text-rose-600">
                {fieldErrors.name}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                Clear description of shipping lane, freight characteristics, and equipment.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION B: Auction Schedule
          ========================================================================= */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3.5 gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100/80">
              <ClockIcon className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Section B: Auction Schedule &amp; Milestones
              </h2>
              <p className="text-[11px] text-slate-400">
                Bidding commencement, preliminary closing time, hard deadline, and cargo pickup
              </p>
            </div>
          </div>

          {/* Explicit User Timezone Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50 px-3 py-0.8 text-[11px] font-medium text-blue-900 shrink-0">
            <span className="font-semibold text-blue-950">Local Timezone:</span>
            <span>{timezoneInfo.formatted}</span>
          </div>
        </div>

        {/* Timezone Transparency Callout */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 text-xs text-slate-600 flex items-start gap-2.5">
          <InfoIcon className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            Inputs are captured in your local timezone and converted to standard timezone-aware ISO 8601 strings (<code className="font-mono text-slate-800">{timezoneInfo.offset}</code>) before transmission. Rule: <span className="font-semibold text-slate-800">Bid Start &lt; Initial Close &lt; Forced Close</span> and <span className="font-semibold text-slate-800">Pickup &gt; Bid Start</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Bid Start Date & Time */}
          <div className="space-y-1.5">
            <label
              htmlFor="bid_start_at"
              className="text-xs font-semibold text-slate-700 block"
            >
              Bid Start Date &amp; Time <span className="text-rose-600">*</span>
            </label>
            <input
              type="datetime-local"
              id="bid_start_at"
              name="bid_start_at"
              value={formData.bid_start_at}
              onChange={(e) => handleChange("bid_start_at", e.target.value)}
              className={`w-full rounded-xl border bg-slate-50/40 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none transition-all ${
                fieldErrors.bid_start_at
                  ? "border-rose-400 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
                  : "border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              }`}
            />
            {fieldErrors.bid_start_at ? (
              <p className="text-[11px] font-medium text-rose-600">
                {fieldErrors.bid_start_at}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                Suppliers can begin submitting bids.
              </p>
            )}
          </div>

          {/* Initial Close Date & Time */}
          <div className="space-y-1.5">
            <label
              htmlFor="initial_close_at"
              className="text-xs font-semibold text-slate-700 block"
            >
              Initial Close Date &amp; Time <span className="text-rose-600">*</span>
            </label>
            <input
              type="datetime-local"
              id="initial_close_at"
              name="initial_close_at"
              value={formData.initial_close_at}
              onChange={(e) => handleChange("initial_close_at", e.target.value)}
              className={`w-full rounded-xl border bg-slate-50/40 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none transition-all ${
                fieldErrors.initial_close_at
                  ? "border-rose-400 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
                  : "border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              }`}
            />
            {fieldErrors.initial_close_at ? (
              <p className="text-[11px] font-medium text-rose-600">
                {fieldErrors.initial_close_at}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                Base auction duration before extension.
              </p>
            )}
          </div>

          {/* Forced Close Date & Time */}
          <div className="space-y-1.5">
            <label
              htmlFor="forced_close_at"
              className="text-xs font-semibold text-slate-700 block"
            >
              Forced Close Deadline <span className="text-rose-600">*</span>
            </label>
            <input
              type="datetime-local"
              id="forced_close_at"
              name="forced_close_at"
              value={formData.forced_close_at}
              onChange={(e) => handleChange("forced_close_at", e.target.value)}
              className={`w-full rounded-xl border bg-slate-50/40 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none transition-all ${
                fieldErrors.forced_close_at
                  ? "border-rose-400 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
                  : "border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              }`}
            />
            {fieldErrors.forced_close_at ? (
              <p className="text-[11px] font-medium text-rose-600">
                {fieldErrors.forced_close_at}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                Absolute hard stop deadline.
              </p>
            )}
          </div>

          {/* Pickup Date & Time */}
          <div className="space-y-1.5">
            <label
              htmlFor="pickup_at"
              className="text-xs font-semibold text-slate-700 block"
            >
              Pickup Date &amp; Time <span className="text-rose-600">*</span>
            </label>
            <input
              type="datetime-local"
              id="pickup_at"
              name="pickup_at"
              value={formData.pickup_at}
              onChange={(e) => handleChange("pickup_at", e.target.value)}
              className={`w-full rounded-xl border bg-slate-50/40 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none transition-all ${
                fieldErrors.pickup_at
                  ? "border-rose-400 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
                  : "border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              }`}
            />
            {fieldErrors.pickup_at ? (
              <p className="text-[11px] font-medium text-rose-600">
                {fieldErrors.pickup_at}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                Target freight departure date.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION C: Auction Extension Rules
          ========================================================================= */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100/80">
            <ShieldCheckIcon className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Section C: British Auction Dynamic Extension Rules
            </h2>
            <p className="text-[11px] text-slate-400">
              Configure trigger window, extension increment, and qualifying event criteria
            </p>
          </div>
        </div>

        {/* Mechanism Explanation Card */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-900 space-y-1">
          <p className="font-semibold text-blue-950 flex items-center gap-1.5 text-xs">
            <InfoIcon className="h-4 w-4 text-blue-700" />
            How British Reverse Auction Extension Works
          </p>
          <p className="text-blue-800 leading-relaxed text-[11px]">
            If a supplier submits a qualifying bid within the final <span className="font-bold">{formData.trigger_window_minutes || "X"} minutes</span> (Trigger Window) prior to the active close time, the closing countdown is automatically prolonged by <span className="font-bold">{formData.extension_minutes || "Y"} minutes</span> (Extension Duration). Extensions can repeat as new qualifying bids arrive, up to the Forced Close deadline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Trigger Window (X) */}
          <div className="space-y-1.5">
            <label
              htmlFor="trigger_window_minutes"
              className="text-xs font-semibold text-slate-700 block"
            >
              Trigger Window (X) <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                id="trigger_window_minutes"
                name="trigger_window_minutes"
                min="1"
                step="1"
                value={formData.trigger_window_minutes}
                onChange={(e) => handleChange("trigger_window_minutes", e.target.value)}
                placeholder="5"
                className={`w-full rounded-xl border bg-slate-50/40 px-3.5 py-2 pr-16 text-xs text-slate-900 focus:bg-white focus:outline-none transition-all ${
                  fieldErrors.trigger_window_minutes
                    ? "border-rose-400 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
                    : "border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                }`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400 pointer-events-none">
                minutes
              </span>
            </div>
            {fieldErrors.trigger_window_minutes ? (
              <p className="text-[11px] font-medium text-rose-600">
                {fieldErrors.trigger_window_minutes}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                Final interval before close that triggers overtime extension.
              </p>
            )}
          </div>

          {/* Extension Duration (Y) */}
          <div className="space-y-1.5">
            <label
              htmlFor="extension_minutes"
              className="text-xs font-semibold text-slate-700 block"
            >
              Extension Duration (Y) <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                id="extension_minutes"
                name="extension_minutes"
                min="1"
                step="1"
                value={formData.extension_minutes}
                onChange={(e) => handleChange("extension_minutes", e.target.value)}
                placeholder="3"
                className={`w-full rounded-xl border bg-slate-50/40 px-3.5 py-2 pr-16 text-xs text-slate-900 focus:bg-white focus:outline-none transition-all ${
                  fieldErrors.extension_minutes
                    ? "border-rose-400 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
                    : "border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                }`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400 pointer-events-none">
                minutes
              </span>
            </div>
            {fieldErrors.extension_minutes ? (
              <p className="text-[11px] font-medium text-rose-600">
                {fieldErrors.extension_minutes}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                Clock increment added when a trigger condition is met.
              </p>
            )}
          </div>

          {/* Extension Trigger Dropdown */}
          <div className="space-y-1.5">
            <label
              htmlFor="extension_trigger"
              className="text-xs font-semibold text-slate-700 block"
            >
              Extension Trigger Rule <span className="text-rose-600">*</span>
            </label>
            <select
              id="extension_trigger"
              name="extension_trigger"
              value={formData.extension_trigger}
              onChange={(e) => handleChange("extension_trigger", e.target.value)}
              className={`w-full rounded-xl border bg-slate-50/40 px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none transition-all ${
                fieldErrors.extension_trigger
                  ? "border-rose-400 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
                  : "border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              }`}
            >
              {EXTENSION_TRIGGERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {fieldErrors.extension_trigger ? (
              <p className="text-[11px] font-medium text-rose-600">
                {fieldErrors.extension_trigger}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                {
                  EXTENSION_TRIGGERS.find((t) => t.value === formData.extension_trigger)
                    ?.description
                }
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Form Actions Footer */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <Link
          href="/rfqs"
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          Cancel &amp; Return to RFQs
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-blue-700 px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <ClockIcon className="h-4 w-4 animate-spin" />
                <span>Creating RFQ...</span>
              </>
            ) : (
              <>
                <PlusIcon className="h-4 w-4" />
                <span>Create RFQ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
