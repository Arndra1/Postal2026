// Geoapify — optional address normalization (geocoding). Not a paid
// person-enrichment provider; only normalizes/completes address fields.
// API: GET https://api.geoapify.com/v1/geocode/search?text=...&format=json&apiKey=KEY
import { fetchJson } from "./types.ts";

export const GEOAPIFY = {
  key: "geoapify",
  name: "Geoapify",
  secretNames: ["GEOAPIFY_API_KEY"],
  capabilities: ["address"],
  defaultPriority: 80,
};

export function isConfigured() {
  return !!process.env.GEOAPIFY_API_KEY;
}

export async function normalizeAddress(inputs) {
  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) return null;
  const text = [inputs.business_name, inputs.address, inputs.city, inputs.state].filter(Boolean).join(", ");
  if (!text) return null;
  const start = Date.now();
  try {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(text)}&format=json&apiKey=${encodeURIComponent(key)}`;
    const { ok, json } = await fetchJson(url);
    if (ok && json && Array.isArray(json.results) && json.results.length > 0) {
      const r = json.results[0];
      return {
        address: r.formatted || "",
        city: r.city || r.town || r.village || inputs.city || "",
        state: r.state || inputs.state || "",
        duration_ms: Date.now() - start,
      };
    }
  } catch (_e) { /* best-effort */ }
  return null;
}