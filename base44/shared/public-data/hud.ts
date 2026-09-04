// HUD provider — geographic / property market intelligence.
// Returns HUD Fair Market Rent metro areas. Used for lawful geographic
// intelligence and market research only — not housing eligibility screening.

import { fetchJson, prospect } from "./types.ts";

export const HUD = {
  key: "hud",
  name: "U.S. Dept. of Housing & Urban Development",
  category: "geographic",
  secret: "HUD_API_TOKEN",
};

export function isConfigured() {
  return !!process.env.HUD_API_TOKEN;
}

// List HUD metro market areas (optionally filtered by state substring).
export async function searchGeographic(inputs) {
  const token = process.env.HUD_API_TOKEN;
  const url = `https://www.huduser.gov/hudapi/public/fmr/listMetroAreas`;
  const { ok, status, json } = await fetchJson(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!ok || !Array.isArray(json)) return { status: "failed", error: `hud_${status}`, results: [] };

  let rows = json;
  if (inputs.state) {
    const st = inputs.state.toUpperCase();
    rows = rows.filter((r) => r.area_name && r.area_name.includes(st));
  }

  const results = rows.slice(0, 25).map((r) =>
    prospect({
      business_name: r.area_name || "",
      jurisdiction: r.area_name || "",
      agency: "U.S. Department of Housing and Urban Development",
      source: "HUD Fair Market Rent Areas",
      source_url: "https://www.huduser.gov/portal/datasets/fmr.html",
      record_type: "geographic_intelligence",
      record_label: "MARKET DATA",
      extra: { cbsa_code: r.cbsa_code, category: r.category },
    })
  );

  return { status: "success", results, source: "HUD" };
}