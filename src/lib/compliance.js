// Compliance constants shared by the signup notice, the in-app terms gate,
// lead pages, and Help. Keep TERMS_VERSION in sync with base44/shared/terms.ts.

export const TERMS_VERSION = "1.0";

// RingBellz offers email-based customer support only — no phone support.
// PRIMARY PUBLIC customer-service address — shown to customers on the website,
// footer, Help/Contact pages, billing pages, and terms/privacy contact points.
// IMPORTANT: support@abundance-consultants.com is the PRIVATE owner/admin
// account address — it must NEVER be displayed publicly or shown to customers.
// The owner receives internal copies of customer-service communications.
export const SUPPORT_EMAIL = "customerservice@abundance-consultants.com";
export const SUPPORT_CATEGORIES = [
  "Account",
  "Billing",
  "Credits",
  "Lead Search",
  "Enrichment",
  "Data Correction",
  "Technical Problem",
  "Privacy",
  "Compliance",
  "Other"
];

export const COMPLIANCE_NOTICE =
  "RingBellz is a lead intelligence, business research, marketing, and contact-enrichment platform. RingBellz is not a consumer reporting agency. Information obtained through RingBellz may be used for lawful marketing, prospecting, business development, research, and customer-acquisition purposes. RingBellz data may not be used to determine eligibility for credit, employment, housing, insurance, government benefits, or any other purpose regulated by the Fair Credit Reporting Act or similar laws.";

export const ACCURACY_NOTICE =
  "Public and third-party information may contain errors, outdated or incomplete information, duplicate records, or incorrect associations. Users should independently verify important information before relying on it. RingBellz does not guarantee that every record is complete, current, or accurate.";

export const MARKETING_NOTICE =
  "Availability of contact information does not itself establish permission to call, text, or email the individual. Users are responsible for complying with applicable outreach and consent laws.";

export const PERMITTED_USES = [
  "Lead generation and customer prospecting",
  "Business development and sales outreach",
  "Market, industry, and geographic research",
  "Business contact discovery, enrichment, and verification",
  "CRM enrichment, lead organization, and lead-list creation",
  "Identifying potential customers and business clients"
];

export const PROHIBITED_ELIGIBILITY_USES = [
  "Consumer credit, loans, financing approval, credit limits, or interest-rate decisions",
  "Employment, hiring, promotion, or termination decisions",
  "Housing, rental approval, or tenant screening",
  "Insurance underwriting, eligibility, or premium decisions",
  "Government benefits eligibility",
  "Any other purpose regulated by the Fair Credit Reporting Act or similar laws"
];

export const CERTIFICATIONS = [
  "I will use RingBellz only for lawful purposes.",
  "I will follow applicable marketing, privacy, telemarketing, and email-marketing laws (including TCPA, Do-Not-Call, and CAN-SPAM rules) and all applicable state and federal regulations.",
  "I will respect do-not-call requirements where applicable.",
  "I will not use RingBellz as a consumer reporting agency, and I will not use RingBellz data for prohibited eligibility decisions.",
  "I will not resell RingBellz data unless specifically authorized.",
  "I will not attempt to misuse, scrape, abuse, or circumvent the platform."
];