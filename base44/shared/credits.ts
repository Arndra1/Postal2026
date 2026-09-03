// Credit system constants and wallet/ledger helpers.
// Shared across enrichment, billing, and admin functions.

export const EXEMPT_ROLES = ["admin", "owner"];
export const ENRICHMENT_COST = 5;
export const MONTHLY_CREDITS = 100;
export const PLAN_PRICE = 59;
export const PLAN_CURRENCY = "USD";
export const PLAN_ID = "leadpulse_pro";

export function isExempt(role) {
  return EXEMPT_ROLES.includes(role);
}

export async function getOrCreateWallet(base44, userId) {
  const existing = await base44.asServiceRole.entities.CreditWallet.filter({ user_id: userId });
  if (existing.length > 0) return existing[0];
  return await base44.asServiceRole.entities.CreditWallet.create({
    user_id: userId,
    balance: 0,
    lifetime_granted: 0,
    lifetime_used: 0
  });
}

export async function getOrCreateSubscription(base44, userId) {
  const existing = await base44.asServiceRole.entities.Subscription.filter({ user_id: userId });
  if (existing.length > 0) return existing[0];
  return await base44.asServiceRole.entities.Subscription.create({
    user_id: userId,
    plan: PLAN_ID,
    status: "none"
  });
}

export async function grantCredits(base44, userId, amount, action, referenceType, referenceId, description) {
  const wallet = await getOrCreateWallet(base44, userId);
  const newBalance = wallet.balance + amount;
  await base44.asServiceRole.entities.CreditWallet.update(wallet.id, {
    balance: newBalance,
    lifetime_granted: (wallet.lifetime_granted || 0) + Math.max(0, amount),
    last_grant_date: new Date().toISOString()
  });
  await base44.asServiceRole.entities.CreditLedger.create({
    user_id: userId,
    action: action || "grant",
    amount,
    balance_after: newBalance,
    reference_type: referenceType || "",
    reference_id: referenceId || "",
    description: description || ""
  });
  return newBalance;
}

// Idempotent charge: skips if a ledger spend already exists for this reference.
export async function chargeCredits(base44, userId, amount, referenceType, referenceId, description) {
  if (referenceId) {
    const dupes = await base44.asServiceRole.entities.CreditLedger.filter({
      user_id: userId,
      action: "spend",
      reference_type: referenceType,
      reference_id: referenceId
    });
    if (dupes.length > 0) {
      return { ok: true, balance: dupes[0].balance_after, duplicate: true };
    }
  }
  const wallet = await getOrCreateWallet(base44, userId);
  if (wallet.balance < amount) {
    return { ok: false, reason: "insufficient_credits", balance: wallet.balance };
  }
  const newBalance = wallet.balance - amount;
  await base44.asServiceRole.entities.CreditWallet.update(wallet.id, {
    balance: newBalance,
    lifetime_used: (wallet.lifetime_used || 0) + amount
  });
  await base44.asServiceRole.entities.CreditLedger.create({
    user_id: userId,
    action: "spend",
    amount: -amount,
    balance_after: newBalance,
    reference_type: referenceType || "",
    reference_id: referenceId || "",
    description: description || ""
  });
  return { ok: true, balance: newBalance, duplicate: false };
}

export function hasActiveMembership(subscription) {
  if (!subscription) return false;
  if (!["active", "trialing"].includes(subscription.status)) return false;
  // An "active" status only counts while the paid period is current.
  // (Owner/admin accounts are exempt regardless — see isExempt.)
  return !subscription.period_end || new Date(subscription.period_end) > new Date();
}