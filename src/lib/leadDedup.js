import { base44 } from "@/api/base44Client";

// Checks if the user already has a saved lead matching this record.
// Keys on official_record_id when available; falls back to business_name + state.
// Never blocks the save on a check failure — returns null so the caller proceeds.
export async function findDuplicateLead(userId, record) {
  try {
    const query = { user_id: userId, saved: true };
    if (record.official_record_id) {
      query.official_record_id = record.official_record_id;
    } else if (record.business_name) {
      query.business_name = record.business_name;
      if (record.state) query.state = record.state;
    } else {
      return null;
    }
    const existing = await base44.entities.Lead.filter(query);
    return existing.length > 0 ? existing[0] : null;
  } catch (_e) {
    return null;
  }
}