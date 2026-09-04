// NumVerify — phone-number validation. Validates candidate phones before they
// count as "verified". Not a person-enrichment provider.
// API: GET https://apilayer.net/api/validate?access_key=KEY&number=PHONE
// Honors optional NUMVERIFY_API_URL (base override) and NUMVERIFY_AUTH_MODE
// ("access_key" default, or "bearer").
import { fetchJson } from "./types.ts";

export const NUMVERIFY = {
  key: "numverify",
  name: "NumVerify",
  secretNames: ["NUMVERIFY_API_KEY"],
  capabilities: ["phone_validation"],
  defaultPriority: 90,
};

export function isConfigured() {
  return !!process.env.NUMVERIFY_API_KEY;
}

export async function validatePhone(phone) {
  const key = process.env.NUMVERIFY_API_KEY;
  if (!key || !phone) return { valid: false, intl: "" };
  const base = process.env.NUMVERIFY_API_URL || "https://apilayer.net/api/validate";
  const num = encodeURIComponent(String(phone).trim());
  const authMode = process.env.NUMVERIFY_AUTH_MODE || "access_key";

  let url;
  const headers = {};
  if (authMode === "bearer") {
    url = `${base}?number=${num}`;
    headers.Authorization = `Bearer ${key}`;
  } else {
    url = `${base}?access_key=${encodeURIComponent(key)}&number=${num}`;
  }

  try {
    const { ok, json } = await fetchJson(url, { headers });
    if (ok && json && json.valid) {
      return { valid: true, intl: json.intl_format || phone };
    }
    return { valid: false, intl: "" };
  } catch (_e) {
    return { valid: false, intl: "" };
  }
}