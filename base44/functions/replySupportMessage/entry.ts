import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { isStaff, unauthorized, badRequest, forbidden } from "../../shared/roles.ts";
import { CUSTOMER_SERVICE_EMAIL, CUSTOMER_SERVICE_EMAIL_2, OWNER_EMAIL } from "../../shared/emails.ts";
import { logActivity } from "../../shared/logging.ts";

// Posts a reply to an existing support request thread.
// - Authenticated users (the ticket owner) and staff/admin/owner can reply.
// - Creates a SupportMessage, updates the ticket status, and emails the
//   other party. Staff replies notify the user; user replies notify staff.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try { user = await base44.auth.me(); } catch (_authErr) { return unauthorized(); }
    if (!user) return unauthorized();

    let body = {};
    try { body = await req.json(); } catch (_e) { return badRequest("Invalid request body."); }

    const supportRequestId = String(body.support_request_id || "").trim();
    const messageText = String(body.body || "").trim().slice(0, 4000);
    if (!supportRequestId || !messageText) {
      return badRequest("A message and support request are required.");
    }

    const staffReply = isStaff(user.role);

    // Fetch the ticket via service role so staff can reply to any ticket.
    const ticket = await base44.asServiceRole.entities.SupportRequest.get(supportRequestId);
    if (!ticket) return badRequest("That support request could not be found.");

    // Non-staff may only reply to their own tickets.
    if (!staffReply && ticket.user_id !== user.id) {
      return forbidden();
    }

    const sender = staffReply ? "staff" : "user";

    // Create the message.
    const message = await base44.entities.SupportMessage.create({
      support_request_id: supportRequestId,
      ticket_user_id: ticket.user_id,
      author_id: user.id,
      author_name: user.full_name || (staffReply ? "RingBellz Support" : ticket.name),
      author_email: user.email || ticket.account_email || "",
      sender,
      body: messageText,
      read_by_user: sender === "user",      // the author has seen their own message
      read_by_staff: sender === "staff"
    });

    // Update ticket status via service role (staff can't update directly).
    const newStatus = staffReply ? "in_progress" : "in_progress";
    try {
      await base44.asServiceRole.entities.SupportRequest.update(supportRequestId, {
        status: newStatus
      });
    } catch (_e) { /* status update is best-effort; the message is stored */ }

    // Email notification to the other party.
    if (staffReply) {
      // Notify the user that support replied.
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: ticket.account_email,
          from_name: "RingBellz Customer Service",
          subject: "Re: " + ticket.subject,
          body:
            "Hi " + (ticket.name || "there") + ",\n\n" +
            "RingBellz Support has replied to your request:\n\n" +
            "----------------------------------------\n" +
            messageText + "\n" +
            "----------------------------------------\n\n" +
            "You can also view and reply to this conversation in the Help section of your RingBellz account.\n\n" +
            "— RingBellz Support"
        });
      } catch (e) {
        console.error("[replySupportMessage] Staff reply email failed for:", ticket.account_email, e?.message || e);
        await logActivity(base44, user, "email_delivery_failed",
          "Failed to send staff reply to " + ticket.account_email + ": " + (e?.message || String(e)),
          { support_request_id: supportRequestId, recipient: ticket.account_email, context: "replySupportMessage_staff" });
      }
    } else {
      // Notify the customer-service inboxes that the user replied.
      const internalBody =
        "A RingBellz user replied to their support request.\n\n" +
        "Subject: " + ticket.subject + "\n" +
        "Category: " + ticket.category + "\n" +
        "From: " + (ticket.name || "—") + " <" + ticket.account_email + ">\n\n" +
        "Reply:\n" + messageText;
      for (const to of [CUSTOMER_SERVICE_EMAIL, CUSTOMER_SERVICE_EMAIL_2, OWNER_EMAIL]) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: to,
            subject: "[RingBellz Support] Reply: " + ticket.subject,
            body: internalBody
          });
        } catch (e) {
          console.error("[replySupportMessage] SendEmail failed for recipient:", to, e?.message || e);
          await logActivity(base44, user, "email_delivery_failed",
            "Failed to send reply notification to " + to + ": " + (e?.message || String(e)),
            { support_request_id: supportRequestId, recipient: to, context: "replySupportMessage_user" });
        }
      }
    }

    return Response.json({ ok: true, message });
  } catch (error) {
    console.error("replySupportMessage error:", error);
    return Response.json({ error: "Could not send your reply. Please try again." }, { status: 500 });
  }
}