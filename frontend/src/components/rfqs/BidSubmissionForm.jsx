"use client";

import { useState, useId, useSyncExternalStore } from "react";
import {
  TrendingDownIcon,
  ShieldCheckIcon,
  InfoIcon,
  TrophyIcon,
} from "@/components/ui/Icons";
import {
  formatCurrency,
  getUserTimezone,
  toTimezoneAwareISO,
} from "@/lib/formatters";

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

function isValidFutureDate(dateString) {
  if (!dateString) return false;
  const validDate = new Date(dateString);
  return !isNaN(validDate.getTime()) && validDate.getTime() > Date.now();
}

/**
 * Bid Submission Form component for live reverse auctions.
 * Enables authorized suppliers to submit competitive freight quotations.
 */
export default function BidSubmissionForm({
  rfq,
  suppliers = [],
  rankings = [],
  auctionState,
  onBidSubmitted,
}) {
  const formId = useId();

  // User Local Timezone using React useSyncExternalStore for hydration and prerender safety
  const timezoneInfo = useSyncExternalStore(
    subscribeToTimezone,
    getClientTimezoneSnapshot,
    getServerTimezoneSnapshot
  );

  // Form inputs
  const [supplierId, setSupplierId] = useState("");
  const [freightCharges, setFreightCharges] = useState("");
  const [originCharges, setOriginCharges] = useState("");
  const [destinationCharges, setDestinationCharges] = useState("");
  const [transitTimeHours, setTransitTimeHours] = useState("24");
  const [validUntil, setValidUntil] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Find selected supplier's existing best ranking/quote
  const selectedSupplierNum = supplierId ? parseInt(supplierId, 10) : null;
  const currentSupplierQuote = selectedSupplierNum
    ? rankings.find((r) => r.supplier_id === selectedSupplierNum)
    : null;

  // Find L1 leader
  const l1Leader = rankings.find((r) => r.rank === 1) || rankings[0];

  // Calculate live total preview
  const parseNum = (val) => {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  const numFreight = parseNum(freightCharges);
  const numOrigin = parseNum(originCharges);
  const numDest = parseNum(destinationCharges);
  const calculatedTotal = numFreight + numOrigin + numDest;

  const hasEnteredAmounts =
    freightCharges !== "" || originCharges !== "" || destinationCharges !== "";

  // Comparison metrics
  let previousTotal = null;
  let diffFromPrevious = null;
  let isHigherThanPrevious = false;

  if (currentSupplierQuote) {
    previousTotal = parseFloat(currentSupplierQuote.total_amount);
    if (!isNaN(previousTotal) && calculatedTotal > 0) {
      diffFromPrevious = calculatedTotal - previousTotal;
      isHigherThanPrevious = calculatedTotal >= previousTotal;
    }
  }

  // Check if beat L1
  const l1Total = l1Leader ? parseFloat(l1Leader.total_amount) : null;
  const beatsL1 =
    l1Total !== null &&
    calculatedTotal > 0 &&
    calculatedTotal < l1Total &&
    (!currentSupplierQuote || currentSupplierQuote.rank !== 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);

    if (!auctionState.isOpen) {
      setErrorBanner(
        `Bidding is currently ${auctionState.label.toLowerCase()} for this RFQ. New bids cannot be placed.`
      );
      return;
    }

    // Validation
    const errs = {};

    if (!supplierId) {
      errs.supplierId = "Please select a participating supplier.";
    }

    if (freightCharges === "" || isNaN(numFreight) || numFreight < 0) {
      errs.freightCharges = "Freight charges must be a non-negative number.";
    } else if (freightCharges.includes(".") && freightCharges.split(".")[1].length > 2) {
      errs.freightCharges = "Maximum 2 decimal places allowed.";
    }

    if (originCharges === "" || isNaN(numOrigin) || numOrigin < 0) {
      errs.originCharges = "Origin charges must be a non-negative number.";
    } else if (originCharges.includes(".") && originCharges.split(".")[1].length > 2) {
      errs.originCharges = "Maximum 2 decimal places allowed.";
    }

    if (destinationCharges === "" || isNaN(numDest) || numDest < 0) {
      errs.destinationCharges = "Destination charges must be a non-negative number.";
    } else if (
      destinationCharges.includes(".") &&
      destinationCharges.split(".")[1].length > 2
    ) {
      errs.destinationCharges = "Maximum 2 decimal places allowed.";
    }

    if (calculatedTotal <= 0) {
      errs.total = "Total quotation amount must be greater than zero.";
    }

    const transitHours = parseInt(transitTimeHours, 10);
    if (isNaN(transitHours) || transitHours <= 0) {
      errs.transitTimeHours = "Transit time must be an integer greater than 0.";
    }

    if (!validUntil) {
      errs.validUntil = "Quotation validity date and time is required.";
    } else if (!isValidFutureDate(validUntil)) {
      errs.validUntil = "Quotation validity must be in the future.";
    }

    if (isHigherThanPrevious) {
      errs.total = `New quotation ($${calculatedTotal.toFixed(
        2
      )}) must be strictly lower than your previous quote of $${previousTotal.toFixed(
        2
      )}.`;
    }

    if (Object.keys(errs).length > 0) {
      setValidationErrors(errs);
      return;
    }

    setValidationErrors({});
    setIsSubmitting(true);

    const payload = {
      supplier_id: parseInt(supplierId, 10),
      freight_charges: numFreight.toFixed(2),
      origin_charges: numOrigin.toFixed(2),
      destination_charges: numDest.toFixed(2),
      transit_time_hours: parseInt(transitTimeHours, 10),
      quote_valid_until: toTimezoneAwareISO(validUntil),
    };

    try {
      const res = await fetch(`/api/rfqs/${rfq.id}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        const errorMsg =
          json.error?.message ||
          `Submission failed with HTTP ${res.status}.`;
        setErrorBanner(errorMsg);
        setIsSubmitting(false);
        return;
      }

      // Success
      setSuccessBanner({
        message: `Bid successfully accepted! Quotation #${json.data.id} recorded with total ${formatCurrency(
          json.data.total_amount
        )}.`,
        bid: json.data,
      });

      // Clear charges for next bid
      setFreightCharges("");
      setOriginCharges("");
      setDestinationCharges("");
      setValidationErrors({});

      if (onBidSubmitted) {
        onBidSubmitted(json.data);
      }
    } catch (err) {
      setErrorBanner(
        err.message || "Failed to submit bid. Please check your network connection."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDisabled = !auctionState.isOpen || isSubmitting;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-slate-100 gap-2 mb-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Submit Competitive Bid
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Place a reverse auction bid with itemized logistics charges.
          </p>
        </div>

        {!auctionState.isOpen && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <InfoIcon className="w-3.5 h-3.5 text-amber-600" />
            Bidding Inactive ({auctionState.label})
          </span>
        )}
      </div>

      {/* Inactive State Notice */}
      {!auctionState.isOpen && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <InfoIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Bidding Window Closed:</span>{" "}
            {auctionState.description}. New quotation submissions are disabled
            for this RFQ.
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorBanner && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
          <InfoIcon className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Bid Submission Rejected:</span>{" "}
            {errorBanner}
          </div>
        </div>
      )}

      {/* Success Banner */}
      {successBanner && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3">
          <ShieldCheckIcon className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Bid Accepted:</span>{" "}
            {successBanner.message}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Row 1: Supplier Selection & Existing Standing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor={`${formId}-supplier`}
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Supplier <span className="text-rose-500">*</span>
            </label>
            <select
              id={`${formId}-supplier`}
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value);
                setValidationErrors((prev) => ({ ...prev, supplierId: null }));
              }}
              disabled={isFormDisabled}
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors ${
                validationErrors.supplierId
                  ? "border-rose-400 bg-rose-50/20"
                  : "border-slate-300"
              } disabled:bg-slate-100 disabled:text-slate-400`}
            >
              <option value="">— Select Registered Supplier —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (ID: #{s.id})
                </option>
              ))}
            </select>
            {validationErrors.supplierId && (
              <p className="mt-1 text-xs text-rose-600">
                {validationErrors.supplierId}
              </p>
            )}
          </div>

          {/* Supplier's Current Status Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex flex-col justify-center">
            {currentSupplierQuote ? (
              <div>
                <div className="flex items-center justify-between text-slate-600 mb-1">
                  <span>Current Best Quote:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(currentSupplierQuote.total_amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Current Rank:{" "}
                    <strong className="text-slate-700">
                      #{currentSupplierQuote.rank}
                    </strong>
                  </span>
                  <span className="text-amber-700 font-medium">
                    New bid must be &lt;{" "}
                    {formatCurrency(currentSupplierQuote.total_amount)}
                  </span>
                </div>
              </div>
            ) : selectedSupplierNum ? (
              <div className="text-slate-500 text-[11px]">
                <span className="font-semibold text-slate-700 block">
                  First bid for this supplier
                </span>
                No prior quotation submitted. Any valid positive quote will be
                accepted.
              </div>
            ) : (
              <div className="text-slate-400 text-[11px]">
                Select a supplier to view their previous quotation standing and
                reduction targets.
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Charge Breakdown (Freight, Origin, Destination) */}
        <div>
          <div className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">
            Itemized Logistics Charges ($ USD)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Freight Charges */}
            <div>
              <label
                htmlFor={`${formId}-freight`}
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Freight Charges <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                  $
                </span>
                <input
                  id={`${formId}-freight`}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={freightCharges}
                  onChange={(e) => {
                    setFreightCharges(e.target.value);
                    setValidationErrors((prev) => ({
                      ...prev,
                      freightCharges: null,
                      total: null,
                    }));
                  }}
                  disabled={isFormDisabled}
                  className={`w-full pl-7 pr-3 py-2 text-xs font-mono rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors ${
                    validationErrors.freightCharges
                      ? "border-rose-400 bg-rose-50/20"
                      : "border-slate-300"
                  } disabled:bg-slate-100 disabled:text-slate-400`}
                />
              </div>
              {validationErrors.freightCharges && (
                <p className="mt-1 text-xs text-rose-600">
                  {validationErrors.freightCharges}
                </p>
              )}
            </div>

            {/* Origin Charges */}
            <div>
              <label
                htmlFor={`${formId}-origin`}
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Origin Charges <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                  $
                </span>
                <input
                  id={`${formId}-origin`}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={originCharges}
                  onChange={(e) => {
                    setOriginCharges(e.target.value);
                    setValidationErrors((prev) => ({
                      ...prev,
                      originCharges: null,
                      total: null,
                    }));
                  }}
                  disabled={isFormDisabled}
                  className={`w-full pl-7 pr-3 py-2 text-xs font-mono rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors ${
                    validationErrors.originCharges
                      ? "border-rose-400 bg-rose-50/20"
                      : "border-slate-300"
                  } disabled:bg-slate-100 disabled:text-slate-400`}
                />
              </div>
              {validationErrors.originCharges && (
                <p className="mt-1 text-xs text-rose-600">
                  {validationErrors.originCharges}
                </p>
              )}
            </div>

            {/* Destination Charges */}
            <div>
              <label
                htmlFor={`${formId}-dest`}
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Destination Charges <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                  $
                </span>
                <input
                  id={`${formId}-dest`}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={destinationCharges}
                  onChange={(e) => {
                    setDestinationCharges(e.target.value);
                    setValidationErrors((prev) => ({
                      ...prev,
                      destinationCharges: null,
                      total: null,
                    }));
                  }}
                  disabled={isFormDisabled}
                  className={`w-full pl-7 pr-3 py-2 text-xs font-mono rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors ${
                    validationErrors.destinationCharges
                      ? "border-rose-400 bg-rose-50/20"
                      : "border-slate-300"
                  } disabled:bg-slate-100 disabled:text-slate-400`}
                />
              </div>
              {validationErrors.destinationCharges && (
                <p className="mt-1 text-xs text-rose-600">
                  {validationErrors.destinationCharges}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Transit Time & Quote Validity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Transit Time Hours */}
          <div>
            <label
              htmlFor={`${formId}-transit`}
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Transit Time (Hours) <span className="text-rose-500">*</span>
            </label>
            <input
              id={`${formId}-transit`}
              type="number"
              step="1"
              min="1"
              placeholder="24"
              value={transitTimeHours}
              onChange={(e) => {
                setTransitTimeHours(e.target.value);
                setValidationErrors((prev) => ({
                  ...prev,
                  transitTimeHours: null,
                }));
              }}
              disabled={isFormDisabled}
              className={`w-full px-3 py-2 text-xs font-mono rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors ${
                validationErrors.transitTimeHours
                  ? "border-rose-400 bg-rose-50/20"
                  : "border-slate-300"
              } disabled:bg-slate-100 disabled:text-slate-400`}
            />
            {validationErrors.transitTimeHours && (
              <p className="mt-1 text-xs text-rose-600">
                {validationErrors.transitTimeHours}
              </p>
            )}
          </div>

          {/* Quotation Validity */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor={`${formId}-validity`}
                className="block text-xs font-medium text-slate-700"
              >
                Quote Valid Until <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {timezoneInfo.formatted}
              </span>
            </div>
            <input
              id={`${formId}-validity`}
              type="datetime-local"
              value={validUntil}
              onChange={(e) => {
                setValidUntil(e.target.value);
                setValidationErrors((prev) => ({
                  ...prev,
                  validUntil: null,
                }));
              }}
              disabled={isFormDisabled}
              className={`w-full px-3 py-2 text-xs font-mono rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors ${
                validationErrors.validUntil
                  ? "border-rose-400 bg-rose-50/20"
                  : "border-slate-300"
              } disabled:bg-slate-100 disabled:text-slate-400`}
            />
            {validationErrors.validUntil && (
              <p className="mt-1 text-xs text-rose-600">
                {validationErrors.validUntil}
              </p>
            )}
          </div>
        </div>

        {/* Calculated Total Preview & Live Comparison Card */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">
              Calculated Total Quotation
            </div>
            <div className="text-2xl font-mono font-bold text-slate-900 mt-0.5">
              {formatCurrency(calculatedTotal)}
            </div>
            {hasEnteredAmounts && (
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                {formatCurrency(numFreight)} + {formatCurrency(numOrigin)} +{" "}
                {formatCurrency(numDest)}
              </div>
            )}
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1 text-xs">
            {beatsL1 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <TrophyIcon className="w-3.5 h-3.5 text-emerald-600" />
                Would Take Rank 1 (L1 Leader)!
              </span>
            )}

            {isHigherThanPrevious ? (
              <span className="text-rose-600 font-medium">
                ⚠️ Bid total must be lower than previous {formatCurrency(previousTotal)}
              </span>
            ) : diffFromPrevious !== null && diffFromPrevious < 0 ? (
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <TrendingDownIcon className="w-3.5 h-3.5" />
                Reduction: {formatCurrency(Math.abs(diffFromPrevious))} (
                {((Math.abs(diffFromPrevious) / previousTotal) * 100).toFixed(1)}
                %)
              </span>
            ) : l1Total !== null && calculatedTotal > 0 ? (
              <span className="text-slate-500">
                Current L1: {formatCurrency(l1Total)}
              </span>
            ) : null}
          </div>
        </div>

        {validationErrors.total && (
          <p className="text-xs text-rose-600 font-medium">
            {validationErrors.total}
          </p>
        )}

        {/* Submit Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isFormDisabled || isHigherThanPrevious}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span>Submitting Bid...</span>
              </>
            ) : (
              <span>Submit Quotation</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
