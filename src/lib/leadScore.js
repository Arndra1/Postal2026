// Lead scoring utility — computes a 0-100 score based on data completeness,
// enrichment status, contact verification, and pipeline progress.
// Pure function, no backend changes needed.

export function computeLeadScore(lead) {
  if (!lead) return 0;
  let score = 0;

  // Contact data completeness (max 40 pts)
  if (lead.email) score += 12;
  if (lead.phone) score += 10;
  if (lead.website) score += 8;
  if (lead.linkedin) score += 6;
  if (lead.address) score += 4;

  // Enrichment status (max 25 pts)
  if (lead.enrichment_status === "enriched") score += 25;
  else if (lead.enrichment_status === "pending") score += 10;

  // Contact verification (max 15 pts)
  if (lead.contact_status === "verified") score += 15;
  else if (lead.contact_status === "unverified") score += 5;

  // Pipeline progress (max 20 pts)
  const pipelineScores = { new: 0, contacted: 5, qualified: 10, won: 20, lost: 0 };
  score += pipelineScores[lead.pipeline_status] || 0;

  return Math.min(100, score);
}

export function getScoreLabel(score) {
  if (score >= 75) return { text: "Hot", className: "bg-red-100 text-red-700" };
  if (score >= 50) return { text: "Warm", className: "bg-amber-100 text-amber-700" };
  if (score >= 25) return { text: "Cool", className: "bg-sky-100 text-sky-700" };
  return { text: "Cold", className: "bg-slate-100 text-slate-600" };
}