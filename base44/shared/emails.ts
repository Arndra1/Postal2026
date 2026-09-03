// Leadora email routing — email-based customer support only, no phone support.
//
// PRIMARY PUBLIC customer-service address — shown to customers on the website,
// footer, Help/Contact pages, billing pages, and terms/privacy contact points.
export const CUSTOMER_SERVICE_EMAIL = "customerservice@abundance-consultants.com";

// Secondary public customer-service address.
export const CUSTOMER_SERVICE_EMAIL_2 = "customerservice1@abundance-consultants.com";

// PRIVATE owner/admin inbox. NEVER displayed publicly or shown to customers.
// Receives internal copies of all customer-service communications, and
// identifies the account that holds the protected database "owner" role.
// The email itself is NOT the security mechanism — every owner privilege
// (permanent access, no subscription, no credit deductions, full admin
// dashboard, user/billing/credit/enrichment/compliance controls, audit logs)
// is enforced by the database role.
export const OWNER_EMAIL = "support@abundance-consultants.com";