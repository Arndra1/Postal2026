import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { SUPPORT_CATEGORIES, SUPPORT_EMAIL } from "@/lib/compliance";

// Email-based "Contact Support" form. No phone support is offered anywhere.
export default function SupportForm() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", account_email: "", company: "", category: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      name: f.name || user.full_name || "",
      account_email: f.account_email || user.email || ""
    }));
  }, [user]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.name && form.account_email && form.category && form.subject && form.message;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await base44.functions.invoke("submitSupportRequest", form);
      setSubmitted(true);
    } catch (_e) {
      setError("We couldn't submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-card rounded-2xl border border-border lady-shadow p-8 text-center">
        <CheckCircle2 className="w-10 h-10 text-accent mx-auto mb-3" />
        <h3 className="font-heading text-lg font-semibold mb-1.5">Request received</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your request has been received. The RingBellz Support Team will respond by email.
        </p>
        <p className="text-xs text-muted-foreground mt-3">Responses are sent to your account email from {SUPPORT_EMAIL}.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="h-10" required />
        </div>
        <div className="space-y-1.5">
          <Label>Account Email</Label>
          <Input type="email" value={form.account_email} onChange={(e) => set("account_email", e.target.value)} className="h-10" required />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Company</Label>
          <Input value={form.company} onChange={(e) => set("company", e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label>Support Category</Label>
          <Select value={form.category} onValueChange={(v) => set("category", v)} required>
            <SelectTrigger className="h-10"><SelectValue placeholder="Select a category" /></SelectTrigger>
            <SelectContent>
              {SUPPORT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Subject</Label>
        <Input value={form.subject} onChange={(e) => set("subject", e.target.value)} className="h-10" required />
      </div>
      <div className="space-y-1.5">
        <Label>Message</Label>
        <Textarea value={form.message} onChange={(e) => set("message", e.target.value)} rows={5} required />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="h-10" disabled={!valid || submitting}>
        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
        Submit Request
      </Button>
    </form>
  );
}