// Credit system constants and wallet/ledger helpers.
// Shared across enrichment, billing, and admin functions.
//
// DUAL-POOL MODEL:
// - Monthly pool (wallet.balance): 100 credits included with the $59/mo subscription.
//   Resets to 100 at each billing cycle — unused credits are forfeited (no rollover).
// - Pack pool (wallet.pack_balance): credits from one-time pack purchases.
//   Never expire, carry over indefinitely until spent.
//
// SPEND ORDER: monthly pool is always drained first; pack pool is only touched
// once the monthly pool is fully depleted for the current cycle.

export const EXEMPT_ROLES = ["admin", "owner"];
export const ENRICHMENT_COST = 5;
export const MONTHLY_CREDITS = 100;
export const PLAN_PRICE = 59;
export const PLAN_CURRENCY = "USD";
export const PLAN_ID = "leadpulse_pro";

export function isExempt(role) {
  return EXEMPT_ROLES.includes(role);
}

// Accepts either a full base44 client or an already-elevated service-role client
// (the payments webhook passes the service role directly).
function svc(base44) {
  return base44.asServiceRole ?? base44;
}

export async function getOrCreateWallet(base44, userId) {
  const existing = await svc(base44).entities.CreditWallet.filter({ user_id: userId });
  if (existing.length > 0) return existing[0];
  return await svc(base44).entities.CreditWallet.create({
    user_id: userId,
    balance: 0,
    pack_balance: 0,
    lifetime_granted: 0,
    lifetime_used: 0
  });
}

export async function getOrCreateSubscription(base44, userId) {
  const existing = await svc(base44).entities.Subscription.filter({ user_id: userId });
  if (existing.length > 0) return existing[0];
  return await svc(base44).entities.Subscription.create({
    user_id: userId,
    plan: PLAN_ID,
    status: "none"
  });
}

// Grant credits to a specific pool ("monthly" or "pack").
// The ledger's balance_after is the TOTAL (monthly + pack) after the grant.
export async function grantCredits(base44, userId, amount, action, referenceType, referenceId, description, pool = "monthly") {
  const wallet = await getOrCreateWallet(base44, userId);
  const isPack = pool === "pack";
  const monthlyBefore = wallet.balance || 0;
  const packBefore = wallet.pack_balance || 0;
  const newMonthly = isPack ? monthlyBefore : monthlyBefore + amount;
  const newPack = isPack ? packBefore + amount : packBefore;

  const updateData = {
    lifetime_granted: (wallet.lifetime_granted || 0) + Math.max(0, amount),
    last_grant_date: new Date().toISOString()
  };
  if (isPack) {
    updateData.pack_balance = newPack;
  } else {
    updateData.balance = newMonthly;
  }

  await svc(base44).entities.CreditWallet.update(wallet.id, updateData);

  await svc(base44).entities.CreditLedger.create({
    user_id: userId,
    action: action || "grant",
    amount,
    balance_after: newMonthly + newPack,
    reference_type: referenceType || "",
    reference_id: referenceId || "",
    description: description || "",
    pool
  });
  return newMonthly + newPack;
}

// Idempotent grant: skips if a ledger grant already exists for this reference.
// Used by the payments webhook, which can deliver the same confirmed payment twice.
export async function grantCreditsOnce(base44, userId, amount, referenceType, referenceId, description, pool = "monthly") {
  if (referenceId) {
    const dupes = await svc(base44).entities.CreditLedger.filter({
      user_id: userId,
      action: "grant",
      reference_type: referenceType,
      reference_id: referenceId
    });
    if (dupes.length > 0) return dupes[0].balance_after;
  }
  return await grantCredits(base44, userId, amount, "grant", referenceType, referenceId, description, pool);
}

// Idempotent monthly reset: sets the monthly pool to exactly `amount` (forfeiting
// any unused monthly credits — no rollover). Pack pool is untouched. Used by the
// payments webhook on membership purchase and on each renewal.
export async function resetMonthlyCreditsOnce(base44, userId, amount, referenceType, referenceId, description) {
  if (referenceId) {
    const dupes = await svc(base44).entities.CreditLedger.filter({
      user_id: userId,
      action: "reset",
      reference_type: referenceType,
      reference_id: referenceId
    });
    if (dupes.length > 0) return dupes[0].balance_after;
  }
  const wallet = await getOrCreateWallet(base44, userId);
  const monthlyBefore = wallet.balance || 0;
  const packBefore = wallet.pack_balance || 0;
  const forfeited = Math.max(0, monthlyBefore - 0); // entire old monthly balance forfeited

  await svc(base44).entities.CreditWallet.update(wallet.id, {
    balance: amount,
    lifetime_granted: (wallet.lifetime_granted || 0) + Math.max(0, amount),
    last_grant_date: new Date().toISOString()
  });

  const desc = forfeited > 0
    ? `${description || ""} (${forfeited} unused monthly credits forfeited at cycle reset)`.trim()
    : description || "";

  const ledger = await svc(base44).entities.CreditLedger.create({
    user_id: userId,
    action: "reset",
    amount,
    balance_after: amount + packBefore,
    reference_type: referenceType || "",
    reference_id: referenceId || "",
    description: desc,
    pool: "monthly"
  });
  return amount + packBefore;
}

// Idempotent charge: skips if a ledger spend already exists for this reference.
// DUAL-POOL SPEND: deducts from the monthly pool first, then the pack pool
// once monthly is fully depleted. Returns which pool(s) were used.
export async function chargeCredits(base44, userId, amount, referenceType, referenceId, description) {
  if (referenceId) {
    const dupes = await svc(base44).entities.CreditLedger.filter({
      user_id: userId,
      action: "spend",
      reference_type: referenceType,
      reference_id: referenceId
    });
    if (dupes.length > 0) {
      return { ok: true, balance: dupes[0].balance_after, duplicate: true, ledger_id: dupes[0].id };
    }
  }
  const wallet = await getOrCreateWallet(base44, userId);
  const monthlyBefore = wallet.balance || 0;
  const packBefore = wallet.pack_balance || 0;
  const total = monthlyBefore + packBefore;

  if (total < amount) {
    return { ok: false, reason: "insufficient_credits", balance: monthlyBefore, pack_balance: packBefore };
  }

  // Spend monthly first, then pack.
  const monthlyDeduct = Math.min(amount, monthlyBefore);
  const packDeduct = amount - monthlyDeduct;
  const newMonthly = monthlyBefore - monthlyDeduct;
  const newPack = packBefore - packDeduct;
  const pool = packDeduct > 0 ? (monthlyDeduct > 0 ? "monthly+pack" : "pack") : "monthly";

  await svc(base44).entities.CreditWallet.update(wallet.id, {
    balance: newMonthly,
    pack_balance: newPack,
    lifetime_used: (wallet.lifetime_used || 0) + amount
  });

  const ledger = await svc(base44).entities.CreditLedger.create({
    user_id: userId,
    action: "spend",
    amount: -amount,
    balance_after: newMonthly + newPack,
    reference_type: referenceType || "",
    reference_id: referenceId || "",
    description: description || "",
    pool
  });
  return { ok: true, balance: newMonthly, pack_balance: newPack, monthly_deduct: monthlyDeduct, pack_deduct: packDeduct, duplicate: false, ledger_id: ledger.id, pool };
}

// Check if the combined pools have enough credits for a charge.
export function hasEnoughCredits(wallet, amount) {
  return ((wallet.balance || 0) + (wallet.pack_balance || 0)) >= amount;
}

export function hasActiveMembership(subscription) {
  if (!subscription) return false;
  // Comped memberships (admin-granted) have full access with no billing cycle.
  if (subscription.status === "comped") return true;
  // Access only counts while the paid period is current.
  // (Owner/admin accounts are exempt regardless — see isExempt.)
  const paidThrough = !subscription.period_end || new Date(subscription.period_end) > new Date();
  if (["active", "trialing"].includes(subscription.status)) return paidThrough;
  // Cancelled-but-still-paid-through memberships keep access until period end.
  if (subscription.status === "cancelled") return paidThrough;
  return false;
}