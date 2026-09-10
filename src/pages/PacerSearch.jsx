import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Search, Loader2, AlertCircle, Info, Coins, ScrollText } from "lucide-react";
import ComplianceBanner from "@/components/ComplianceBanner";
import { MARKETING_NOTICE } from "@/lib/compliance";
import { useToast } from "@/components/ui/use-toast";
import PacerResultCard from "@/components/pacer/PacerResultCard";

export default function PacerSearch() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [results, setResults] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creditsCharged, setCreditsCharged] = useState(0);
  const [balance, setBalance] = useState(null);
  const { toast } = useToast();

  const runSearch = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: "Both names required", variant: "destructive" });
      return;
    }
    setLoading(true);
    setError("");
    setResults(null);
    setStatus("");
    setCreditsCharged(0);
    try {
      const response = await base44.functions.invoke("searchPacer", {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      const data = response.data || response;
      setStatus(data.status || "");
      setCreditsCharged(data.credits_charged || 0);
      setBalance({ monthly: data.monthly_balance, pack: data.pack_balance });
      if (data.status === "failed") {
        setError(data.error || "PACER search failed. No credits were charged.");
      } else {
        setResults(data.results || {});
      }
      if ((data.credits_charged || 0) > 0) {
        toast({ title: "1 credit used", description: "PACER party search complete." });
      }
    } catch (e) {
      setError("PACER search failed. Please try again.");
    }
    setLoading(false);
  };

  const list = results?.partyList || [];
  const hasResults = Array.isArray(list) && list.length > 0;

  return (
    <div>
      <PageHeader
        title="PACER Party Search"
        subtitle="Search federal court party/case records via PACER's Party Case Locator. Returns party and case data only."
      />

      <ComplianceBanner text={MARKETING_NOTICE} />

      <div className="glass-panel p-4 mb-6 border-l-4 border-primary flex items-start gap-3">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">This returns court case & party data — NOT contact info.</p>
          PACER party search identifies federal court cases and named parties. It does <strong>not</strong> return addresses, phone numbers, or email addresses.
        </div>
      </div>

      <div className="glass-panel p-5 mb-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. John" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Smith" className="mt-1.5" onKeyDown={(e) => e.key === "Enter" && runSearch()} />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
          <Coins className="w-4 h-4 text-primary" />
          Each search costs <strong className="text-foreground mx-1">1 credit</strong>, charged only when PACER returns a real response.
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="mt-4" disabled={loading || !firstName.trim() || !lastName.trim()}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              {loading ? "Searching..." : "Search PACER"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm PACER search?</AlertDialogTitle>
              <AlertDialogDescription>
                This search will use <strong>1 credit</strong> from your balance. The credit is charged only if PACER returns a real response (results or no results). If PACER is unreachable, no credit is charged.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={runSearch}>Confirm &amp; Search</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {error && (
        <div className="glass-panel p-4 mb-6 border-l-4 border-destructive flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      )}

      {status && status !== "failed" && (
        <div className="flex items-center gap-2 mb-4">
          <ScrollText className="w-5 h-5 text-primary" />
          <h2 className="font-heading text-lg font-semibold">
            {status === "success" ? `${list.length} match${list.length !== 1 ? "es" : ""} found` : "No matches found"}
          </h2>
          {creditsCharged > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">1 credit used</span>
          )}
          {balance && balance.monthly != null && (
            <span className="text-xs text-muted-foreground ml-2">
              Balance: {balance.monthly} monthly{balance.pack ? ` + ${balance.pack} pack` : ""}
            </span>
          )}
        </div>
      )}

      {hasResults && (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((r, i) => (
            <PacerResultCard key={r.partyId || r.id || i} result={r} />
          ))}
        </div>
      )}

      {!loading && !error && status === "no_results" && (
        <div className="glass-panel p-16 text-center">
          <ScrollText className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-heading text-lg font-semibold mb-1">No matches found</h3>
          <p className="text-sm text-muted-foreground">PACER returned no party records for that name.</p>
        </div>
      )}

      {!loading && !error && !status && (
        <div className="glass-panel p-16 text-center">
          <Search className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-heading text-lg font-semibold mb-1">Search federal court parties</h3>
          <p className="text-sm text-muted-foreground">Enter a first and last name to search PACER's Party Case Locator.</p>
        </div>
      )}
    </div>
  );
}