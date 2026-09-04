// Provider registry — the single source of truth for available enrichment
// providers. Add a new provider by registering it here; the orchestrator
// (providers.ts) picks it up automatically.

import { PDL, isConfigured as pdlConfigured, enrich as pdlEnrich } from "./pdl.ts";
import { ENRICH_SO, isConfigured as enrichConfigured, enrich as enrichEnrich } from "./enrichSo.ts";
import { TRACERFY, isConfigured as tracerfyConfigured, hasRequiredInputs as tracerfyHasInputs, enrich as tracerfyEnrich } from "./tracerfy.ts";
import { NUMVERIFY, isConfigured as numverifyConfigured } from "./numverify.ts";
import { GEOAPIFY, isConfigured as geoapifyConfigured } from "./geoapify.ts";

// Person/company enrichment providers (the waterfall). Order = default priority.
export const PERSON_PROVIDERS = [
  { meta: PDL, configured: pdlConfigured, enrich: pdlEnrich },
  { meta: ENRICH_SO, configured: enrichConfigured, enrich: enrichEnrich },
  { meta: TRACERFY, configured: tracerfyConfigured, enrich: tracerfyEnrich, hasInputs: tracerfyHasInputs },
];

export const AUX_PROVIDERS = [
  { meta: NUMVERIFY, configured: numverifyConfigured },
  { meta: GEOAPIFY, configured: geoapifyConfigured },
];

export function allProviderMeta() {
  return [
    ...PERSON_PROVIDERS.map((p) => p.meta),
    ...AUX_PROVIDERS.map((p) => p.meta),
  ];
}