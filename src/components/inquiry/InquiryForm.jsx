import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import ResponsiveSelect from "@/components/ResponsiveSelect";
import { NEED_TYPES, US_STATES } from "@/lib/community";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

// The exact wording the person agrees to. Stored verbatim with every inquiry so
// the record shows precisely what was consented to, and when.
export const INQUIRY_DISCLOSURE =
  "I am asking to be contacted about the financial education and credit services described on this page. I agree to be contacted by phone call, text message, or email at the contact information I provide, including by automated means. Consent is not a condition of any purchase. I understand I can withdraw my consent at any time by replying STOP to a text message or telling the sender to stop.";

export default function InquiryForm() {
  const params = new URLSearchParams(window.location.search);
  const referredBy = params.get("ref") || "";

  const [form, setForm] = useState({ name: "", email: "", phone: "", city: "", state: "", need_type: "personal_credit", message: "" });
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) { setError("Please enter your name."); return; }
    if (!form.email.trim() && !form.phone.trim()) { setError("Please add an email address or a phone number so we can reach you."); return; }
    if (!consent) { setError("Please check the consent box so we may contact you."); return; }

    setSubmitting(true);
    try {
      await base44.functions.invoke("submitInquiry", {
        ...form,
        consent: true,
        consent_text: INQUIRY_DISCLOSURE,
        source: "public_inquiry_page",
        referred_by: referredBy,
      });
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.error || "We could not submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="glass-panel p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-7 h-7 text-emerald-700" />
        </div>
        <h2 className="font-heading text-xl font-semibold">Your request is in</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Thank you, {form.name.split(" ")[0]}. Someone will reach out using the contact information you gave us. If you asked for a workshop or education, we will follow up with details on dates.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="glass-panel p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Your name *</Label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="h-11" placeholder="First and last name" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Email</Label>
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="h-11" placeholder="you@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Phone</Label>
          <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="h-11" placeholder="(555) 555-5555" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">City</Label>
          <Input value={form.city} onChange={(e) => set("city", e.target.value)} className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">State</Label>
          <ResponsiveSelect
            value={form.state}
            onChange={(v) => set("state", v)}
            aria-label="State"
            options={[{ value: "", label: "Select a state" }, ...US_STATES.map((s) => ({ value: s.code, label: s.name }))]}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">What do you need help with? *</Label>
          <ResponsiveSelect
            value={form.need_type}
            onChange={(v) => set("need_type", v)}
            aria-label="What do you need help with"
            options={NEED_TYPES.map((n) => ({ value: n.value, label: n.label }))}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Tell us more (optional)</Label>
          <Textarea
            value={form.message}
            onChange={(e) => set("message", e.target.value)}
            className="min-h-[110px]"
            placeholder="Anything you want us to know before we reach out."
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-white/40 p-4">
        <div className="flex items-start gap-3">
          <Checkbox id="inquiry-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
          <label htmlFor="inquiry-consent" className="text-xs leading-relaxed text-muted-foreground cursor-pointer">
            {INQUIRY_DISCLOSURE}
          </label>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Button type="submit" size="lg" className="mt-5 w-full h-12" disabled={submitting}>
        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
        {submitting ? "Sending…" : "Send my request"}
      </Button>
      <p className="mt-3 text-[11px] text-center text-muted-foreground">
        We never buy or scrape lists. You are here because you asked.
      </p>
    </form>
  );
}