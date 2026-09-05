// Public-data provider registry. Maps source categories to their provider
// modules. Add a new public-data source by registering it here; the
// searchPublicLeads function picks it up automatically.

import { CENSUS, isConfigured as censusConfigured, searchMarketIntel } from "./census.ts";
import { DATA_GOV, isConfigured as datagovConfigured, searchBusinessEntities } from "./datagov.ts";
import { COURTLISTENER, isConfigured as clConfigured, searchParties } from "./courtlistener.ts";
import { HUD, isConfigured as hudConfigured, searchGeographic } from "./hud.ts";
import { PROPUBLICA, isConfigured as propublicaConfigured, searchNonprofits } from "./propublica.ts";

export const PUBLIC_SOURCES = [
  { meta: DATA_GOV, configured: datagovConfigured, search: searchBusinessEntities },
  { meta: COURTLISTENER, configured: clConfigured, search: searchParties },
  { meta: CENSUS, configured: censusConfigured, search: searchMarketIntel },
  { meta: HUD, configured: hudConfigured, search: searchGeographic },
  { meta: PROPUBLICA, configured: propublicaConfigured, search: searchNonprofits },
];

export function allSourceMeta() {
  return PUBLIC_SOURCES.map((s) => s.meta);
}

export function providerForCategory(category) {
  return PUBLIC_SOURCES.find((s) => s.meta.category === category) || null;
}