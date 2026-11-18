/**
 * Reusable API access layer for GoComet British Auction backend.
 * Connects to FastAPI backend at /api/v1/*.
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

/**
 * Fetch a single RFQ by its numeric database ID.
 *
 * @param {number|string} rfqId
 * @returns {Promise<{ data: object | null, error: { message: string, code?: string, status?: number } | null }>}
 */
export async function getRFQById(rfqId) {
  const baseUrl = getBackendBaseUrl();
  const endpoint = `${baseUrl}/api/v1/rfqs/${rfqId}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let resJson = null;
    try {
      resJson = await res.json();
    } catch {
      // not JSON
    }

    if (res.status === 404) {
      return {
        data: null,
        error: {
          message: `RFQ #${rfqId} was not found.`,
          code: "NOT_FOUND",
          status: 404,
        },
      };
    }

    if (!res.ok) {
      return {
        data: null,
        error: {
          message: resJson?.detail || `Backend returned HTTP ${res.status} (${res.statusText || "Error"})`,
          code: "NON_2XX",
          status: res.status,
        },
      };
    }

    return {
      data: resJson,
      error: null,
    };
  } catch (err) {
    const isAbort = err.name === "AbortError";
    return {
      data: null,
      error: {
        message: isAbort
          ? `Connection to backend timed out (${baseUrl}).`
          : `Cannot reach backend at ${baseUrl}. Please ensure FastAPI is running.`,
        code: isAbort ? "TIMEOUT" : "NETWORK_ERROR",
        status: 503,
      },
    };
  }
}

/**
 * Fetch current supplier rankings for an RFQ.
 *
 * @param {number|string} rfqId
 * @returns {Promise<{ data: Array<object>, error: { message: string, code?: string, status?: number } | null }>}
 */
export async function getRFQRankings(rfqId) {
  const baseUrl = getBackendBaseUrl();
  const endpoint = `${baseUrl}/api/v1/rfqs/${rfqId}/rankings`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let resJson = null;
    try {
      resJson = await res.json();
    } catch {
      // not json
    }

    if (res.status === 404) {
      return {
        data: [],
        error: {
          message: `RFQ #${rfqId} not found`,
          code: "NOT_FOUND",
          status: 404,
        },
      };
    }

    if (!res.ok) {
      return {
        data: [],
        error: {
          message: resJson?.detail || `Failed to fetch rankings (HTTP ${res.status})`,
          code: "NON_2XX",
          status: res.status,
        },
      };
    }

    return {
      data: Array.isArray(resJson) ? resJson : [],
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      error: {
        message: err.message || "Failed to load supplier rankings",
        code: "NETWORK_ERROR",
        status: 503,
      },
    };
  }
}

/**
 * Fetch the complete historical bids for an RFQ.
 *
 * @param {number|string} rfqId
 * @returns {Promise<{ data: Array<object>, error: { message: string, code?: string, status?: number } | null }>}
 */
export async function getRFQBidHistory(rfqId) {
  const baseUrl = getBackendBaseUrl();
  const endpoint = `${baseUrl}/api/v1/rfqs/${rfqId}/bids`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let resJson = null;
    try {
      resJson = await res.json();
    } catch {
      // not json
    }

    if (res.status === 404) {
      return {
        data: [],
        error: {
          message: `RFQ #${rfqId} not found`,
          code: "NOT_FOUND",
          status: 404,
        },
      };
    }

    if (!res.ok) {
      return {
        data: [],
        error: {
          message: resJson?.detail || `Failed to fetch bid history (HTTP ${res.status})`,
          code: "NON_2XX",
          status: res.status,
        },
      };
    }

    return {
      data: Array.isArray(resJson) ? resJson : [],
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      error: {
        message: err.message || "Failed to load bid history",
        code: "NETWORK_ERROR",
        status: 503,
      },
    };
  }
}

/**
 * Submit a new bid for an RFQ.
 *
 * @param {number|string} rfqId
 * @param {object} payload
 * @returns {Promise<{ data: object | null, error: { message: string, code?: string, status?: number, details?: any } | null, status: number }>}
 */
export async function submitRFQBid(rfqId, payload) {
  const baseUrl = getBackendBaseUrl();
  const endpoint = `${baseUrl}/api/v1/rfqs/${rfqId}/bids`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let resJson = null;
    try {
      resJson = await res.json();
    } catch {
      // not json
    }

    if (res.status === 201) {
      return {
        data: resJson,
        error: null,
        status: 201,
      };
    }

    // 404 Not Found (RFQ or Supplier)
    if (res.status === 404) {
      return {
        data: null,
        error: {
          message: resJson?.detail || "RFQ or Supplier not found",
          code: "NOT_FOUND",
          status: 404,
        },
        status: 404,
      };
    }

    // 422 Unprocessable Entity (Bid validation error or Pydantic validation)
    if (res.status === 422) {
      let msg = "Bid validation failed.";
      if (typeof resJson?.detail === "string") {
        msg = resJson.detail;
      } else if (Array.isArray(resJson?.detail) && resJson.detail.length > 0) {
        msg = resJson.detail
          .map((d) => {
            const field = Array.isArray(d.loc) ? d.loc.slice(-1)[0] : "Field";
            return `${field}: ${d.msg}`;
          })
          .join("; ");
      }

      return {
        data: null,
        error: {
          message: msg,
          code: "VALIDATION_ERROR",
          status: 422,
          details: resJson?.detail,
        },
        status: 422,
      };
    }

    return {
      data: null,
      error: {
        message: resJson?.detail || `Backend error (HTTP ${res.status})`,
        code: "NON_2XX",
        status: res.status,
      },
      status: res.status,
    };
  } catch (err) {
    const isAbort = err.name === "AbortError";
    return {
      data: null,
      error: {
        message: isAbort
          ? `Bid submission timed out after 10 seconds (${baseUrl}).`
          : `Cannot reach backend at ${baseUrl}. Please check connection.`,
        code: isAbort ? "TIMEOUT" : "NETWORK_ERROR",
        status: 503,
      },
      status: 503,
    };
  }
}

/**
 * Fetch chronological activity timeline for an RFQ.
 *
 * @param {number|string} rfqId
 * @returns {Promise<{ data: Array<object>, error: { message: string, code?: string, status?: number } | null }>}
 */
export async function getRFQActivity(rfqId) {
  const baseUrl = getBackendBaseUrl();
  const endpoint = `${baseUrl}/api/v1/rfqs/${rfqId}/activity`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let resJson = null;
    try {
      resJson = await res.json();
    } catch {
      // not json
    }

    if (res.status === 404) {
      return {
        data: [],
        error: {
          message: `RFQ #${rfqId} not found`,
          code: "NOT_FOUND",
          status: 404,
        },
      };
    }

    if (!res.ok) {
      return {
        data: [],
        error: {
          message: resJson?.detail || `Failed to fetch activity log (HTTP ${res.status})`,
          code: "NON_2XX",
          status: res.status,
        },
      };
    }

    return {
      data: Array.isArray(resJson) ? resJson : [],
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      error: {
        message: err.message || "Failed to load activity timeline",
        code: "NETWORK_ERROR",
        status: 503,
      },
    };
  }
}

/**
 * Create a new RFQ by sending a POST request to the backend.
 *
 * @param {object} payload
 * @returns {Promise<{ data: object | null, error: { message: string, code?: string, status?: number, details?: any } | null, status: number }>}
 */
export async function createRFQ(payload) {
  const baseUrl = getBackendBaseUrl();
  const endpoint = `${baseUrl}/api/v1/rfqs`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let resJson = null;
    try {
      resJson = await res.json();
    } catch {
      // Body not JSON
    }

    if (res.status === 201) {
      return {
        data: resJson,
        error: null,
        status: 201,
      };
    }

    // 409 Conflict: Duplicate reference ID
    if (res.status === 409) {
      const msg =
        typeof resJson?.detail === "string"
          ? resJson.detail
          : "An RFQ with this reference ID already exists.";
      return {
        data: null,
        error: {
          message: msg,
          code: "DUPLICATE_REFERENCE",
          status: 409,
        },
        status: 409,
      };
    }

    // 422 Unprocessable Entity: Validation errors
    if (res.status === 422) {
      let msg = "Validation failed on the backend.";
      if (Array.isArray(resJson?.detail) && resJson.detail.length > 0) {
        msg = resJson.detail
          .map((d) => {
            const fieldName = Array.isArray(d.loc) ? d.loc.slice(-1)[0] : "Field";
            return `${fieldName}: ${d.msg}`;
          })
          .join("; ");
      } else if (typeof resJson?.detail === "string") {
        msg = resJson.detail;
      }

      return {
        data: null,
        error: {
          message: msg,
          code: "VALIDATION_ERROR",
          status: 422,
          details: resJson?.detail,
        },
        status: 422,
      };
    }

    // Other non-2xx responses
    return {
      data: null,
      error: {
        message:
          typeof resJson?.detail === "string"
            ? resJson.detail
            : `Backend returned HTTP ${res.status} (${res.statusText || "Error"})`,
        code: "NON_2XX",
        status: res.status,
      },
      status: res.status,
    };
  } catch (err) {
    const isAbort = err.name === "AbortError";
    return {
      data: null,
      error: {
        message: isAbort
          ? `Connection to backend timed out after 10 seconds (${baseUrl}).`
          : `Cannot reach backend at ${baseUrl}. Please ensure the FastAPI server is running.`,
        code: isAbort ? "TIMEOUT" : "NETWORK_ERROR",
        status: 503,
      },
      status: 503,
    };
  }
}

/**
 * Fetch the list of suppliers from the backend API.
 *
 * @returns {Promise<{ data: Array<object>, error: { message: string, code?: string, status?: number } | null }>}
 */
export async function getSuppliers() {
  const baseUrl = getBackendBaseUrl();
  const endpoint = `${baseUrl}/api/v1/suppliers`;

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
          message: "Expected an array of suppliers from backend, but received non-array payload.",
          code: "MALFORMED_PAYLOAD",
        },
      };
    }

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

/**
 * Register a new supplier by sending a POST request to the backend.
 *
 * @param {{ name: string }} payload
 * @returns {Promise<{ data: object | null, error: { message: string, code?: string, status?: number, details?: any } | null, status: number }>}
 */
export async function createSupplier(payload) {
  const baseUrl = getBackendBaseUrl();
  const endpoint = `${baseUrl}/api/v1/suppliers`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let resJson = null;
    try {
      resJson = await res.json();
    } catch {
      // Body not JSON
    }

    if (res.status === 201) {
      return {
        data: resJson,
        error: null,
        status: 201,
      };
    }

    // 422 Unprocessable Entity
    if (res.status === 422) {
      let msg = "Validation failed on the backend.";
      if (Array.isArray(resJson?.detail) && resJson.detail.length > 0) {
        msg = resJson.detail
          .map((d) => {
            const fieldName = Array.isArray(d.loc) ? d.loc.slice(-1)[0] : "Field";
            return `${fieldName}: ${d.msg}`;
          })
          .join("; ");
      } else if (typeof resJson?.detail === "string") {
        msg = resJson.detail;
      }

      return {
        data: null,
        error: {
          message: msg,
          code: "VALIDATION_ERROR",
          status: 422,
          details: resJson?.detail,
        },
        status: 422,
      };
    }

    // Other non-2xx responses
    return {
      data: null,
      error: {
        message:
          typeof resJson?.detail === "string"
            ? resJson.detail
            : `Backend returned HTTP ${res.status} (${res.statusText || "Error"})`,
        code: "NON_2XX",
        status: res.status,
      },
      status: res.status,
    };
  } catch (err) {
    const isAbort = err.name === "AbortError";
    return {
      data: null,
      error: {
        message: isAbort
          ? `Connection to backend timed out after 10 seconds (${baseUrl}).`
          : `Cannot reach backend at ${baseUrl}. Please ensure the FastAPI server is running.`,
        code: isAbort ? "TIMEOUT" : "NETWORK_ERROR",
        status: 503,
      },
      status: 503,
    };
  }
}
