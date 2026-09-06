import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const FIELDS = [
  { key: "person_name", label: "Contact Name", placeholder: "Jane Doe" },
  { key: "business_name", label: "Business Name", placeholder: "Acme Corp" },
  { key: "job_title", label: "Job Title", placeholder: "CEO" },
  { key: "email", label: "Email", placeholder: "jane@acme.com", type: "email" },
  { key: "phone", label: "Phone", placeholder: "(555) 123-4567" },
  { key: "website", label: "Website", placeholder: "https://acme.com" },
  { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/janedoe" },
  { key: "address", label: "Address", placeholder: "123 Main St" },
  { key: "city", label: "City", placeholder: "Philadelphia" },
  { key: "state", label: "State", placeholder: "PA" },
  { key: "industry", label: "Industry", placeholder: "Marketing" },
];

export default function ManualLeadForm({ onSaved }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.business_name && !form.person_name) {
      toast({ title: "Name required", description: "Enter at least a contact or business name.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const lead = await base44.entities.Lead.create({
        user_id: user.id,
        person_name: form.person_name || "",
        business_name: form.business_name || "",
        job_title: form.job_title || "",
        email: form.email || "",
        phone: form.phone || "",
        website: form.website || "",
        linkedin: form.linkedin || "",
        address: form.address || "",
        city: form.city || "",
        state: form.state || "",
        industry: form.industry || "",
        saved: true,
        contact_status: form.email || form.phone ? "unverified" : "unknown",
        enrichment_status: "none",
        pipeline_status: "new",
        lead_type: "business",
        source_category: "market_intelligence",
        record_label: "MANUAL ENTRY",
        retrieval_timestamp: new Date().toISOString(),
      });
      toast({ title: "Lead saved", description: `${lead.business_name || lead.person_name} added to your saved leads.` });
      setForm({});
      if (onSaved) onSaved(lead);
    } catch (_e) {
      toast({ title: "Failed to save", description: "Please try again.", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="glass-panel p-6">
      <div className="grid sm:grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{f.label}</Label>
            <Input
              type={f.type || "text"}
              value={form[f.key] || ""}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="h-10"
            />
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <Button type="submit" disabled={saving} className="h-10">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Lead
        </Button>
      </div>
    </form>
  );
}