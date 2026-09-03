import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Leadora support: email-based customer support only — no phone support.
// Stores the request and notifies the Abundance customer-service inboxes
// (internal), plus sends a confirmation email to the requester.
const CATEGORIES = ["Account", "Billing", "Credits", "Lead Search", "Enrichment", "Data Correction", "Technical Problem", "Privacy", "Compliance", "Other"];
const CUSTOMER_SERVICE_EMAILS = [
  "customerservice@abundance-consultants.com",
  "customerservice1@abundance-consultants.com"
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_e) { return Response.json({ error: "Invalid request body." }, { status: 400 }); }

    const name = String(body.name || "").trim().slice(0, 100);
    const accountEmail = String(body.account_email || "").trim().slice(0, 200);
    const company = String(body.company || "").trim().slice(0, 100);
    const category = String(body.category || "").trim();
    const subject = String(body.subject || "").trim().slice(0, 150);
    const message = String(body.message || "").trim().slice(0, 4000);

    if (!name || !accountEmail || !subject || !message) {
      return Response.json({ error: "Name, account email, subject, and message are required." }, { status: 400 });
    }
    if (!CATEGORIES.includes(category)) {
      return Response.json({ error: "Please choose a valid support category." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail)) {
      return Response.json({ error: "Please provide a valid account email." }, { status: 400 });
    }

    const record = await base44.entities.SupportRequest.create({
      user_id: user.id,
      name: name,
      account_email: accountEmail,
      company: company,
      category: category,
      subject: subject,
      message: message,
      status: "new"
    });

    // Internal notification to Abundance customer service. Delivery to
    // non-app-user addresses depends on plan/domain configuration — a send
    // failure never fails the request itself.
    const submittedAt = new Date().toISOString();
    const internalBody =
      "New Leadora support request\n\n" +
      "Category: " + category + "\n" +
      "Subject: " + subject + "\n\n" +
      "From: " + name + " <" + accountEmail + ">\n" +
      "Company: " + (company || "—") + "\n" +
      "Submitted: " + submittedAt + "\n\n" +
      "Message:\n" + message;
    for (const to of CUSTOMER_SERVICE_EMAILS) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: to,
          subject: "[Leadora Support] " + category + ": " + subject,
          body: internalBody
        });
      } catch (_e) { /* email delivery is best-effort; the request is stored */ }
    }

    // Confirmation email to the requester.
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: accountEmail,
        subject: "We received your Leadora support request",
        body:
          "Hi " + name + ",\n\n" +
          "Your Leadora support request has been received.\n\n" +
          "Category: " + category + "\n" +
          "Subject: " + subject + "\n\n" +
          "The Leadora Support Team will respond by email. Please do not submit duplicate requests for the same issue.\n\n" +
          "— Leadora Support"
      });
    } catch (_e) { /* best-effort */ }

    return Response.json({
      ok: true,
      request_id: record.id,
      message: "Your request has been received. The Leadora Support Team will respond by email."
    });
  } catch (error) {
    return Response.json({ error: "Could not submit your request. Please try again." }, { status: 500 });
  }
}