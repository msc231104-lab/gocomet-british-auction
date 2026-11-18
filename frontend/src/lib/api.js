/**
 * Reusable API access layer for GoComet British Auction backend.
 * Connects to FastAPI backend at /api/v1/rfqs.
 */

export function getBackendBaseUrl() {
  const url =
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:8000";
  return url.replace(/\/+$/, "");
}

/**
 * Fetch the list of RFQs from the backend API.
 * Handles timeouts, network failures, non-2xx responses, and malformed bodies gracefully.
 *
 * @returns {Promise<{ data: Array<object>, error: { message: string, code?: string, status?: number } | null }>}
 */
export async function getRFQs() {
  const baseUrl = getBackendBaseUrl();
  const endpoint = `${baseUrl}/api/v1/rfqs`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let detail = "";
      try {
        const errorJson = await res.json();
        detail = errorJson.detail ? `: ${errorJson.detail}` : "";
      } catch {
        // Response body might not be JSON
      }

      return {
        data: [],
        error: {
          message: `Backend returned HTTP ${res.status} (${res.statusText || "Error"})${detail}`,
          code: "NON_2XX",
          status: res.status,
        },
      };
    }

    let rawData;
    try {
      rawData = await res.json();
    } catch {
      return {
        data: [],
        error: {
          message: "Failed to parse backend response as JSON.",
          code: "MALFORMED_JSON",
        },
      };
    }

    if (!Array.isArray(rawData)) {
      return {
        data: [],
        error: {
          message: "Expected an array of RFQs from backend, but received non-array payload.",
          code: "MALFORMED_PAYLOAD",
        },
      };
    }

    // Valid array received
    return {
      data: rawData,
      error: null,
    };
  } catch (err) {
    const isAbort = err.name === "AbortError";
    const message = isAbort
      ? `Connection to backend timed out after 8 seconds (${baseUrl}).`
      : `Cannot reach backend at ${baseUrl}. Please ensure the FastAPI server is running.`;

    return {
      data: [],
      error: {
        message,
        code: isAbort ? "TIMEOUT" : "NETWORK_ERROR",
      },
    };
  }
}
