import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CUSTOMER_SERVICE_EMAIL, OWNER_EMAIL } from "../../shared/emails.ts";
import { logActivity } from "../../shared/logging.ts";

// RingBellz support: email-based customer support only — no phone support.
// Stores the request, notifies the customer-service inboxes, and sends the
// owner a private copy of every customer-service communication. The owner's
// address is internal only — customers only ever see the customer-service
// addresses.
const CATEGORIES = ["Account", "Billing", "Credits", "Lead Search", "Enrichment", "Data Correction", "Technical Problem", "Privacy", "Compliance", "Other"];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try { user = await base44.auth.me(); } catch (_authErr) { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
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
      "New RingBellz support request\n\n" +
      "Category: " + category + "\n" +
      "Subject: " + subject + "\n\n" +
      "From: " + name + " <" + accountEmail + ">\n" +
      "Company: " + (company || "—") + "\n" +
      "Submitted: " + submittedAt + "\n\n" +
      "Message:\n" + message;
    for (const to of [CUSTOMER_SERVICE_EMAIL, OWNER_EMAIL]) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: to,
          subject: "[RingBellz Support] " + category + ": " + subject,
          body: internalBody
        });
      } catch (e) {
        console.error("[submitSupportRequest] SendEmail failed for recipient:", to, e?.message || e);
        await logActivity(base44, user, "email_delivery_failed",
          "Failed to send support notification to " + to + ": " + (e?.message || String(e)),
          { support_request_id: record.id, recipient: to, context: "submitSupportRequest" });
      }
    }

    // Confirmation email to the requester.
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: accountEmail,
        from_name: "RingBellz Customer Service",
        subject: "We received your RingBellz support request",
        body:
          "Hi " + name + ",\n\n" +
          "Your RingBellz support request has been received.\n\n" +
          "Category: " + category + "\n" +
          "Subject: " + subject + "\n\n" +
          "The RingBellz Support Team will respond by email. Please do not submit duplicate requests for the same issue.\n\n" +
          "— RingBellz Support"
      });
    } catch (e) {
      console.error("[submitSupportRequest] Confirmation email failed for:", accountEmail, e?.message || e);
      await logActivity(base44, user, "email_delivery_failed",
        "Failed to send confirmation email to " + accountEmail + ": " + (e?.message || String(e)),
        { support_request_id: record.id, recipient: accountEmail, context: "submitSupportRequest_confirmation" });
    }

    return Response.json({
      ok: true,
      request_id: record.id,
      message: "Your request has been received. The RingBellz Support Team will respond by email."
    });
  } catch (error) {
    return Response.json({ error: "Could not submit your request. Please try again." }, { status: 500 });
  }
}