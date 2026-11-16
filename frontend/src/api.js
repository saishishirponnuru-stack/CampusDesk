export const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
let token = "";
export function setToken(value) {
  token = value;
}

async function request(path, options = {}) {
  const session = token;
  let res;
  try {
    res = await fetch(base + "/api" + path, {
      ...options,
      signal:
        options.signal && AbortSignal.any
          ? AbortSignal.any([options.signal, AbortSignal.timeout(30000)])
          : options.signal || AbortSignal.timeout(30000),
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(session ? { Authorization: "Bearer " + session } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error(
      "The service is taking longer than expected or could not be reached. Please try again; it may be starting up.",
    );
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // An old request must never expire a newer login. Tokens remain memory-only.
    if (
      res.status === 401 &&
      path !== "/auth/login" &&
      session &&
      session === token
    ) {
      token = "";
      window.dispatchEvent(new Event("session-expired"));
    }
    throw new Error(
      body.message ||
        (res.status >= 500
          ? "Service temporarily unavailable. Please try again shortly."
          : "Request failed"),
    );
  }
  return res;
}
export async function api(path, options = {}) {
  const res = await request(path, options);
  return res.status === 204 ? null : res.json();
}
export async function downloadFile(path, filename) {
  const res = await request(path);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function download(type, query = "") {
  return downloadFile(
    "/reports/" + type + ".csv" + (query ? "?" + query : ""),
    type + ".csv",
  );
}
