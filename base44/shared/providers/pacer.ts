// PACER PCL (Party Case Locator) integration.
//
// FULLY ISOLATED from the enrichment pipeline. This module imports NOTHING from
// providers.ts, pdl.ts, enrichSo.ts, domainResolver.ts, tracerfy.ts, geoapify.ts,
// or numverify.ts. It is a dedicated court party/case lookup, NOT contact
// enrichment. PACER returns court case and party data only — it never returns
// address, phone, or email contact information.
import { secrets } from "base44:runtime";

const PACER_AUTH_URL = "https://pacer.login.uscourts.gov/services/cso-auth";
const PCL_PARTY_SEARCH_URL = "https://pcl.uscourts.gov/pcl-public-api/rest/parties/find";
const REQUEST_TIMEOUT_MS = 25000;

export function isConfigured() {
  return !!(secrets.get("PACER_USERNAME") && secrets.get("PACER_PASSWORD"));
}

// Authenticate against the PACER Central Sign-On.
// Success: { loginResult: "0", nextGenCSO: "<token>", errorDescription: "" }
// loginResult !== "0" = auth failed; errorDescription carries the message.
// Returns { ok, token, error }. token is the CSO session token (nextGenCSO).
export async function authenticate() {
  const username = secrets.get("PACER_USERNAME");
  const password = secrets.get("PACER_PASSWORD");
  if (!username || !password) {
    return { ok: false, token: "", error: "PACER credentials not configured" };
  }
  try {
    const resp = await fetchWithTimeout(PACER_AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loginId: username,
        password,
        clientCode: "",
        redactFlag: "1"
      })
    });
    if (!resp.ok) {
      return { ok: false, token: "", error: `PACER auth HTTP ${resp.status}` };
    }
    const data = await resp.json().catch(() => ({}));
    if (data.loginResult !== "0") {
      const msg = data.errorDescription || `PACER auth failed (loginResult: ${data.loginResult})`;
      return { ok: false, token: "", error: msg };
    }
    const token = data.nextGenCSO || "";
    if (!token) {
      return { ok: false, token: "", error: "PACER auth returned no nextGenCSO token" };
    }
    return { ok: true, token, error: "" };
  } catch (e) {
    return { ok: false, token: "", error: `PACER auth failed: ${e.message || String(e)}` };
  }
}

// Party search via PCL.
// Header: X-NEXT-GEN-CSO (custom header, NOT Authorization: Bearer).
// Response carries results in `partyList` specifically.
// Returns { ok, found, results, error }.
export async function searchParty(token, firstName, lastName) {
  if (!token) return { ok: false, found: false, results: {}, error: "Missing PACER session token" };
  try {
    const resp = await fetchWithTimeout(PCL_PARTY_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-NEXT-GEN-CSO": token
      },
      body: JSON.stringify({
        lastName: lastName || "",
        firstName: firstName || "",
        exactNameMatch: false
      })
    });
    if (!resp.ok) {
      return { ok: false, found: false, results: {}, error: `PCL search HTTP ${resp.status}` };
    }
    const data = await resp.json().catch(() => ({}));
    const list = data.partyList;
    const found = Array.isArray(list) && list.length > 0;
    return { ok: true, found, results: data, error: "" };
  } catch (e) {
    return { ok: false, found: false, results: {}, error: `PCL search failed: ${e.message || String(e)}` };
  }
}

function fetchWithTimeout(url, options, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}