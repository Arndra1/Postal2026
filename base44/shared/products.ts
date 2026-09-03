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
  credits_250: { kind: "credit_pack", name: "250 Leadora Credits", price: "19.00", currency: "USD", credits: 250 },
  credits_500: { kind: "credit_pack", name: "500 Leadora Credits", price: "35.00", currency: "USD", credits: 500 },
  credits_1000: { kind: "credit_pack", name: "1,000 Leadora Credits", price: "59.00", currency: "USD", credits: 1000 },
  credits_2500: { kind: "credit_pack", name: "2,500 Leadora Credits", price: "129.00", currency: "USD", credits: 2500 },
  credits_5000: { kind: "credit_pack", name: "5,000 Leadora Credits", price: "229.00", currency: "USD", credits: 5000 }
};

export function resolveProduct(productId: string) {
  return PRODUCTS[productId] ?? null;
}