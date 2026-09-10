// RingBellz email configuration — single source of truth.
//
// IMPORTANT: OWNER_EMAIL is the PRIVATE owner/admin account address.
// It must NEVER be displayed publicly or shown to customers — the owner
// receives internal copies of customer-service communications instead.
// Privileges are enforced by the database "owner" role, never by the email.
export const OWNER_EMAIL = "support@abundance-consultants.com";

// Public customer-service addresses (shown to customers).
export const CUSTOMER_SERVICE_EMAIL = "customerservice@abundance-consultants.com";
export const CUSTOMER_SERVICE_EMAILS = [CUSTOMER_SERVICE_EMAIL];