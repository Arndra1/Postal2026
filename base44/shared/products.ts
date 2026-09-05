// Payment product catalog — SINGLE SOURCE OF TRUTH for Base44 Payments products.
// Used by create-checkout (server-side pricing) and payments-webhook (fulfillment).
// The client NEVER supplies a price, product name, or credit amount — only this key,
// which is resolved server-side. Shared between functions so pricing and fulfillment
// can never drift apart.

export const MEMBERSHIP_PRODUCT_ID = "leadora_membership";

// kind: "membership" (monthly, auto-renewing) | "credit_pack" (one-time)
export const PRODUCTS: Record<string, any> = {
  [MEMBERSHIP_PRODUCT_ID]: {
    kind: "membership",
    name: "Leadora Membership",
    price: "59.00",
    currency: "USD",
    credits: 100
  },
  // One-time credit packs — purchased credits go to the Pack pool (never expire).
  credits_small: { kind: "credit_pack", name: "25 Leadora Credits", price: "19.00", currency: "USD", credits: 25 },
  credits_medium: { kind: "credit_pack", name: "75 Leadora Credits", price: "49.00", currency: "USD", credits: 75 },
  credits_large: { kind: "credit_pack", name: "150 Leadora Credits", price: "89.00", currency: "USD", credits: 150 }
};

export function resolveProduct(productId: string) {
  return PRODUCTS[productId] ?? null;
}