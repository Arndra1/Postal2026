import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Check, X, Mail, Phone, Globe, Linkedin, MapPin, Briefcase, Building2, ShieldCheck, AlertCircle } from "lucide-react";

export default function Enrich() {
  const { user } = useAuth();
  const [form, setForm] = useState({ person_name: "", business_name: "", website: "", city: "", state: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("enrichLead", { inputs: form });
      setResult(res.data);
    } catch (err) {
      setResult({ status: "failed", error: err?.response?.data?.error || "Enrichment failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const f = (key, label, placeholder, icon) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
        <Input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className="h-10" />
      </div>
    </div>
  );

  const success = result?.status === "success";

  return (
    <div>
      <PageHeader title="Enrich" subtitle="Turn a name and company into verified contact intelligence." />

      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={run} className="bg-card rounded-2xl border border-border lady-shadow p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Enrichment Inputs</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {f("person_name", "Person Name", "Jordan Avery", <Sparkles className="w-4 h-4" />)}
            {f("business_name", "Business Name", "Northwind Consulting", <Building2 className="w-4 h-4" />)}
            {f("website", "Website", "northwindco.com", <Globe className="w-4 h-4" />)}
            {f("job_title", "Job Title", "Director of Ops", <Briefcase className="w-4 h-4" />)}
            {f("city", "City", "San Francisco", <MapPin className="w-4 h-4" />)}
            {f("state", "State", "CA", null)}
            {f("email", "Email (if known)", "jordan@...", <Mail className="w-4 h-4" />)}
            {f("phone", "Phone (if known)", "+1 ...", <Phone className="w-4 h-4" />)}
          </div>
          <Button type="submit" className="w-full mt-5 h-11" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enriching...</> : <><Sparkles className="w-4 h-4 mr-2" /> Run Enrichment</>}
          </Button>
          <p className="text-xs text-muted-foreground mt-3 text-center">5 credits per successful enrichment · No charge on failed lookups</p>
        </form>

        <div className="bg-card rounded-2xl border border-border lady-shadow p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Enrichment Result</h2>
          {!result && !loading && <div className="text-center py-12 text-muted-foreground text-sm">Enter lead details and run an enrichment to see verified contact data.</div>}
          {loading && <div className="flex flex-col items-center justify-center py-16"><Loader2 className="w-8 h-8 text-primary animate-spin mb-3" /><p className="text-sm text-muted-foreground">Contacting provider...</p></div>}
          {result && !success && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3"><AlertCircle className="w-6 h-6 text-destructive" /></div>
              <p className="font-medium">No verified data found</p>
              <p className="text-sm text-muted-foreground mt-1">{result.error || "The provider returned no verified contact information."}</p>
              <p className="text-xs text-accent mt-3 font-medium">0 credits charged</p>
            </div>
          )}
          {result && success && (
            <div>
              <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-accent/10">
                <ShieldCheck className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium">Verified contact data · {result.credits_charged} credits charged</span>
              </div>
              <div className="space-y-3">
                {[
                  { icon: Mail, label: "Verified Email", value: result.results.verified_email },
                  { icon: Phone, label: "Verified Phone", value: result.results.verified_phone },
                  { icon: Globe, label: "Website", value: result.results.website },
                  { icon: Linkedin, label: "LinkedIn", value: result.results.linkedin },
                  { icon: MapPin, label: "Address", value: result.results.address },
                  { icon: Briefcase, label: "Job Title", value: result.results.job_title },
                  { icon: Building2, label: "Company", value: result.results.company },
                ].map((row) => (
                  <div key={row.label} className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border">
                    <row.icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">{row.label}</div>
                      <div className="text-sm font-medium break-all">{row.value || "—"}</div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-accent" /> Confidence: <span className="font-medium text-foreground capitalize">{result.results.confidence}</span>
                  <span className="mx-1">·</span> Provider: <span className="font-medium text-foreground">{result.data_sources.join(", ")}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}