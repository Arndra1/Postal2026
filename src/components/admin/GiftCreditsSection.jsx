import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Gift, Loader2, CheckCircle2 } from "lucide-react";

// Admin-only panel for granting (gifting) credits to any user.
// Calls the adminGrantCredits backend function, which verifies the caller
// is admin/owner, resolves the target user by email or ID, and records
// the grant in the CreditLedger via grantCredits.
export default function GiftCreditsSection({ onGranted }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [pool, setPool] = useState("monthly");
  const [granting, setGranting] = useState(false);
  const [result, setResult] = useState(null);

  const handleGrant = async () => {
    const amt = parseInt(amount, 10);
    if (!email.trim()) {
      toast({ title: "Email required", description: "Enter a user email or ID.", variant: "destructive" });
      return;
    }
    if (!Number.isInteger(amt) || amt <= 0) {
      toast({ title: "Invalid amount", description: "Enter a positive whole number.", variant: "destructive" });
      return;
    }
    setGranting(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("adminGrantCredits", {
        userIdentifier: email.trim(),
        amount: amt,
        pool
      });
      setResult(res.data);
      toast({
        title: "Credits granted",
        description: `${res.data.amount} credits → ${res.data.target_email}. New balance: ${res.data.new_balance}.`
      });
      if (onGranted) onGranted();
    } catch (e) {
      const err = e?.response?.data || {};
      toast({
        title: "Grant failed",
        description: err.error || e?.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="glass-card p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-5 h-5 text-primary" />
        <h2 className="font-heading text-lg font-semibold">Gift Credits</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Grant credits to any user by email or ID. The grant is recorded in the credit ledger with the admin's email for audit.
      </p>
      <div className="grid sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
        <div>
          <Label htmlFor="gift-email" className="mb-1.5">User email or ID</Label>
          <Input id="gift-email" placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="gift-amount" className="mb-1.5">Amount</Label>
          <Input id="gift-amount" type="number" min="1" placeholder="50" className="w-24" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1.5">Pool</Label>
          <Select value={pool} onValueChange={setPool}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="pack">Pack</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleGrant} disabled={granting} className="h-9">
          {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
          Grant
        </Button>
      </div>
      {result && (
        <div className="mt-4 flex items-center gap-2 text-sm bg-accent/10 border border-accent/20 rounded-lg p-3">
          <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
          <span>
            <strong>{result.amount}</strong> credits granted to <strong>{result.target_email}</strong> ({result.pool} pool).
            New total balance: <strong>{result.new_balance}</strong>.
          </span>
        </div>
      )}
    </div>
  );
}