// Billing webhook endpoint — PERMANENTLY DISABLED (fails closed).
// SECURITY: this endpoint previously accepted unauthenticated requests and could
// grant memberships and credits from forged "payment success" events. It now
// rejects every request.
// Confirmed payment events from Base44 Payments arrive through the platform's
// authenticated payment workflow trigger — never through this endpoint.
export default async function(req) {
  return Response.json(
    { error: "This billing webhook is disabled. Payment events are handled by Base44 Payments." },
    { status: 403 }
  );
}