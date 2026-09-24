import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public inquiry intake — reachable WITHOUT a login.
//
// An individual who wants help states their own need here. Nothing is inferred
// from a public record: the person asks, and the exact disclosure they agreed
// to is stored with a timestamp. The record is written with the service role
// because an anonymous visitor has no app-user identity.
//
// Anyone can reach this endpoint, so every field is bounded and the stored
// record is written from validated values only.
const NEED_TYPES = ["personal_credit", "debt_help", "business_credit", "financial_education", "other"];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch (_e) { body = {}; }

    const name = String(body.name || "").trim().slice(0, 120);
    const email = String(body.email || "").trim().slice(0, 200);
    const phone = String(body.phone || "").trim().slice(0, 40);
    const consent = body.consent === true;
    const consentText = String(body.consent_text || "").trim().slice(0, 2000);

    if (!name) {
      return Response.json({ error: "Please enter your name.", code: "missing_name" }, { status: 400 });
    }
    if (!email && !phone) {
      return Response.json({ error: "Please add an email address or a phone number so we can reach you.", code: "missing_contact" }, { status: 400 });
    }
    if (!consent) {
      return Response.json({ error: "Please check the consent box so we may contact you.", code: "missing_consent" }, { status: 400 });
    }

    // Inquiries belong to the account that owns the public page.
    const ownerId = await resolveOwnerId(base44);
    if (!ownerId) {
      return Response.json({ error: "This form is not accepting requests right now. Please try again later.", code: "no_owner" }, { status: 503 });
    }

    const created = await base44.asServiceRole.entities.Inquiry.create({
      user_id: ownerId,
      name,
      email,
      phone,
      city: String(body.city || "").trim().slice(0, 80),
      state: String(body.state || "").trim().toUpperCase().slice(0, 2),
      need_type: NEED_TYPES.includes(body.need_type) ? body.need_type : "other",
      message: String(body.message || "").trim().slice(0, 2000),
      consent_text: consentText,
      consent_at: new Date().toISOString(),
      source: String(body.source || "public_inquiry_page").slice(0, 80),
      referred_by: String(body.referred_by || "").trim().slice(0, 160),
      status: "new",
    });

    return Response.json({ status: "success", inquiry_id: created.id });
  } catch (error) {
    return Response.json({ error: "We could not submit your request. Please try again." }, { status: 500 });
  }
}

async function resolveOwnerId(base44) {
  try {
    const owners = await base44.asServiceRole.entities.User.filter({ role: "owner" });
    if (owners && owners.length) return owners[0].id;
  } catch (_e) { /* fall through to full list */ }

  try {
    const all = await base44.asServiceRole.entities.User.list();
    const found = (all || []).find((u) => u.role === "owner" || u.role === "admin");
    return found ? found.id : "";
  } catch (_e) {
    return "";
  }
}