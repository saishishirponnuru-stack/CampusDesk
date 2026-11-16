export const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
let token = "";
export function setToken(value) {
  token = value;
}
export async function api(path, options = {}) {
  const res = await fetch(base + "/api" + path, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({ message: "Unable to reach the service" }));
    if (res.status === 401 && path !== "/auth/login")
      window.dispatchEvent(new Event("session-expired"));
    throw new Error(body.message || "Request failed");
  }
  return res.status === 204 ? null : res.json();
}
export async function download(type) {
  const res = await fetch(base + "/api/reports/" + type + ".csv", {
    headers: { Authorization: "Bearer " + token },
  });
  if (!res.ok)
    throw new Error(
      "Unable to download report. Please sign in again if your session expired.",
    );
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = type + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}
